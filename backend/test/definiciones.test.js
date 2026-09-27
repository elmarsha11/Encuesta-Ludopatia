// Chequeos de integridad de las definiciones de encuestas.
// Las definiciones se editan a mano: estos tests atrapan errores de tipeo
// antes de que lleguen a la base o a la pantalla.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENCUESTAS } from '../encuestas/index.js';
import { contenidoDe } from '../../scripts/generar-contenido.js';

const TIPOS = new Set(['numero', 'unica', 'multiple', 'escala', 'texto', 'info']);
const FORMATO_ID = /^[a-z][a-z0-9_]*$/;

for (const encuesta of Object.values(ENCUESTAS)) {
  describe(`definición de ${encuesta.id}`, () => {
    test('los ids de preguntas son únicos y con formato válido para SQL', () => {
      const ids = encuesta.preguntas.map((p) => p.id);
      assert.equal(new Set(ids).size, ids.length, 'hay ids repetidos');
      for (const id of ids) assert.match(id, FORMATO_ID);
    });

    test('cada pregunta tiene un tipo conocido y pertenece a una sección existente', () => {
      const secciones = new Set(encuesta.secciones.map((s) => s.id));
      for (const p of encuesta.preguntas) {
        assert.ok(TIPOS.has(p.tipo), `${p.id}: tipo desconocido ${p.tipo}`);
        assert.ok(secciones.has(p.seccion), `${p.id}: sección inexistente ${p.seccion}`);
        assert.ok(p.texto, `${p.id}: falta el texto`);
      }
    });

    test('las opciones tienen valores únicos con formato válido', () => {
      for (const p of encuesta.preguntas.filter((q) => q.opciones)) {
        const valores = p.opciones.map((o) => o.valor);
        assert.equal(new Set(valores).size, valores.length, `${p.id}: opciones repetidas`);
        for (const v of valores) assert.match(v, FORMATO_ID, `${p.id}: valor inválido ${v}`);
      }
    });

    test('cada condición apunta a una pregunta ANTERIOR y a opciones que existen', () => {
      const anteriores = new Map();
      for (const p of encuesta.preguntas) {
        if (p.visibleSi) {
          const origen = anteriores.get(p.visibleSi.pregunta);
          assert.ok(origen, `${p.id}: la condición apunta a una pregunta inexistente o posterior`);
          for (const v of p.visibleSi.es) {
            assert.ok(
              origen.opciones.some((o) => o.valor === v),
              `${p.id}: la condición usa la opción inexistente ${v}`,
            );
          }
        }
        anteriores.set(p.id, p);
      }
    });

    test('las secciones de cada pregunta aparecen en orden (sin saltar y volver)', () => {
      const orden = encuesta.secciones.map((s) => s.id);
      const indices = encuesta.preguntas.map((p) => orden.indexOf(p.seccion));
      for (let i = 1; i < indices.length; i++) {
        assert.ok(indices[i] >= indices[i - 1], `${encuesta.preguntas[i].id} rompe el orden de secciones`);
      }
    });

    test('tiene todos los textos de pantalla', () => {
      const { intro, consentimiento, edadFueraDeRango, cierre } = encuesta.pantallas;
      assert.ok(intro.titulo && intro.texto);
      for (const punto of intro.puntos ?? []) assert.ok(punto.destacado && punto.texto);
      assert.ok(consentimiento.pregunta && consentimiento.si && consentimiento.no);
      assert.ok(edadFueraDeRango);
      assert.ok(cierre.titulo && cierre.texto);
    });
  });
}

test('docs/diseno/contenido-*.md están actualizados (correr `npm run contenido`)', () => {
  for (const encuesta of Object.values(ENCUESTAS)) {
    const ruta = new URL(`../../docs/diseno/contenido-${encuesta.id}.md`, import.meta.url);
    assert.equal(readFileSync(ruta, 'utf8'), contenidoDe(encuesta), encuesta.id);
  }
});

// El frontend elige el componente de cada escala por su forma (design/adultos/HANDOFF.md):
// un slider muestra la etiqueta del paso elegido, así que necesita una para cada paso.
for (const encuesta of Object.values(ENCUESTAS)) {
  describe(`escalas de ${encuesta.id}`, () => {
    test('los sliders tienen etiqueta en cada paso', () => {
      for (const p of encuesta.preguntas.filter((q) => q.presentacion === 'slider')) {
        for (let v = p.min; v <= p.max; v++) assert.ok(p.etiquetas?.[v], `${p.id}: falta la etiqueta del paso ${v}`);
      }
    });

    test('rangosSmvm cubre cada paso, sin huecos ni solapamientos', () => {
      for (const p of encuesta.preguntas.filter((q) => q.rangosSmvm)) {
        assert.ok(encuesta.smvmReferencia > 0, `${p.id}: la encuesta no tiene smvmReferencia`);
        let hastaAnterior = 0;
        for (let v = p.min; v <= p.max; v++) {
          const rango = p.rangosSmvm[v];
          assert.ok(rango, `${p.id}: falta el rango del paso ${v}`);
          const [desde, hasta] = rango;
          assert.equal(desde, hastaAnterior, `${p.id}: el paso ${v} no empieza donde terminó el anterior`);
          if (v === p.max) assert.equal(hasta, null, `${p.id}: el último paso no debe tener tope`);
          else assert.ok(hasta > desde, `${p.id}: el paso ${v} está vacío o invertido`);
          hastaAnterior = hasta;
        }
      }
    });
  });
}

describe('«Prefiero no responder»', () => {
  test('en escalas usa un valor con formato válido y no choca con ningún paso', () => {
    for (const encuesta of Object.values(ENCUESTAS)) {
      for (const p of encuesta.preguntas.filter((q) => q.opcionNoResponde)) {
        assert.equal(p.tipo, 'escala', `${p.id}: opcionNoResponde solo tiene sentido en escalas`);
        assert.match(p.opcionNoResponde.valor, FORMATO_ID);
        assert.ok(p.opcionNoResponde.texto);
      }
    }
  });

  test('el PGSI no la tiene: su puntaje necesita los 9 ítems respondidos', () => {
    for (const p of ENCUESTAS.adultos.preguntas.filter((q) => q.seccion === 'pgsi')) {
      assert.equal(p.opcionNoResponde, undefined, p.id);
    }
  });
});
