// Tests de la lógica del frontend (frontend/motor/logica.js).
// Además de probar cada función, verifican que lo que el frontend enviaría
// sea EXACTAMENTE lo que el backend acepta, recorriendo caminos reales.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../frontend/motor/logica.js';
import { definicionPublica } from '../encuestas/publica.js';
import { validarRespuesta } from '../validacion.js';
import adolescentes from '../encuestas/adolescentes.js';
import adultos from '../encuestas/adultos.js';

// El frontend recibe la definición por JSON: se simula ese viaje.
const def = JSON.parse(JSON.stringify(definicionPublica(adolescentes)));
const pregunta = (id) => def.preguntas.find((p) => p.id === id);

describe('ramas', () => {
  test('la Sección 3 aparece solo si apostó', () => {
    const ids = (r) => L.pasos(def, r).map((s) => (s.clase === 'seccion' ? `#${s.seccion.id}` : s.pregunta.id));
    assert.ok(!ids({ aposto_alguna_vez: 'nunca' }).includes('en_que_aposto'));
    assert.ok(ids({ aposto_alguna_vez: 'si_ultimo_anio' }).includes('en_que_aposto'));
    assert.ok(ids({ aposto_alguna_vez: 'si_ultimo_anio' }).includes('#experiencia'));
  });

  test('cambiar de rama descarta las respuestas de la rama anterior', () => {
    const r = L.limpiar(def, { edad: 15, aposto_alguna_vez: 'nunca', en_que_aposto: ['skins'], motivo: ['curiosidad'] });
    assert.deepEqual(r, { edad: 15, aposto_alguna_vez: 'nunca' });
  });
});

describe('alternar (opción múltiple)', () => {
  const p = pregunta('en_que_aposto');
  const op = (v) => p.opciones.find((o) => o.valor === v);

  test('marca y desmarca respetando el orden de las opciones', () => {
    let v = L.alternar(p, [], op('skins'));
    v = L.alternar(p, v, op('deportivas_online'));
    assert.deepEqual(v, ['deportivas_online', 'skins']);
    assert.deepEqual(L.alternar(p, v, op('skins')), ['deportivas_online']);
  });

  test('la exclusiva desmarca las demás, y otra opción desmarca la exclusiva', () => {
    const conExclusiva = L.alternar(p, ['skins', 'cartas'], op('prefiero_no_responder'));
    assert.deepEqual(conExclusiva, ['prefiero_no_responder']);
    assert.deepEqual(L.alternar(p, conExclusiva, op('skins')), ['skins']);
  });
});

describe('progreso', () => {
  test('la barra nunca retrocede al decidir una rama corta', () => {
    const r = { edad: 15, genero: 'mujer' };
    const antes = L.progreso(def, r, 3, L.pasos(def, r));
    const r2 = { ...r, aposto_alguna_vez: 'nunca' };
    const lista2 = L.pasos(def, r2);
    const despues = L.progreso(def, r2, 4, lista2);
    assert.ok(despues.hechas >= antes.hechas);
    assert.ok(despues.hechas / despues.total >= antes.hechas / antes.total);
  });

  test('el motivo de píxeles va de 0 a 1 y nunca supera 1', () => {
    const r = { edad: 15, aposto_alguna_vez: 'nunca' };
    const lista = L.pasos(def, r);
    assert.ok(L.avanceMotivo(def, r, 0, lista) > 0);
    assert.ok(L.avanceMotivo(def, r, lista.length - 1, lista) <= 1);
    assert.equal(L.calma(0), 0);
    assert.equal(L.calma(1), 1);
  });

  test('píxeles: invisibles antes de aparecer y en fila al final', () => {
    assert.ok(L.pixeles(0, false).every((px) => px.opacidad === '0'));
    const fila = L.pixeles(1, true, 342);
    assert.ok(fila.every((px) => px.y === 24));
    assert.equal(fila.at(-1).x, 336);
  });
});

describe('lo que envía el frontend lo acepta el backend', () => {
  test('camino "sí apostó" completo', () => {
    const r = L.limpiar(def, {
      edad: '15', // el campo de texto guarda un string: cuerpo() lo convierte a número
      genero: 'varon',
      aposto_alguna_vez: 'si_ultimo_anio',
      en_que_aposto: ['skins'],
      frecuencia_ultimo_anio: 'algunas_mes',
      motivo: ['prefiero_no_responder'],
      como_accedio: 'cuenta_ajena',
      conoce_alguien: 'si_varias',
      escala_perder_control: 4,
      comentario: '   hola   ',
    });
    const c = L.cuerpo(def, r);
    assert.equal(c.edad, 15);
    assert.equal(c.comentario, 'hola');
    assert.deepEqual(validarRespuesta(adolescentes, c).errores, undefined);
  });

  test('camino mínimo (solo la edad): lo no respondido no se envía', () => {
    const c = L.cuerpo(def, { edad: 13, donde_publicidad: [], comentario: '  ' });
    assert.deepEqual(c, { edad: 13 });
    assert.equal(validarRespuesta(adolescentes, c).ok, true);
  });

  test('las pantallas informativas de adultos no se envían', () => {
    const defAdultos = JSON.parse(JSON.stringify(definicionPublica(adultos)));
    const c = L.cuerpo(defAdultos, { info_ef: 'x', edad: 30 });
    assert.deepEqual(c, { edad: 30 });
  });
});

test('formatearApertura escribe la fecha en hora argentina', () => {
  assert.equal(L.formatearApertura('2026-10-19T11:00:00.000Z'), 'el lunes 19 de octubre a las 08:00');
});

// --- Adultos: componentes nuevos (design/adultos/HANDOFF.md) ---------------------

const defAdultos = JSON.parse(JSON.stringify(definicionPublica(adultos)));
const deAdultos = (id) => defAdultos.preguntas.find((p) => p.id === id);

describe('qué componente dibuja cada escala', () => {
  test('según la forma de la escala, no según la encuesta', () => {
    assert.equal(L.componenteEscala(deAdultos('ingresos_hogar')), 'tramos');
    assert.equal(L.componenteEscala(deAdultos('monto_por_vez')), 'tramos');
    assert.equal(L.componenteEscala(deAdultos('pgsi_1')), 'frecuencia');
    const escalaAdolescentes = def.preguntas.find((p) => p.tipo === 'escala');
    assert.equal(L.componenteEscala(escalaAdolescentes), 'puntos');
  });

  test('el contador del PGSI va de 1 a 9 sobre el camino actual', () => {
    const lista = L.pasos(defAdultos, { aposto_12m: 'si' });
    assert.deepEqual(L.contextoFrecuencia(deAdultos('pgsi_1'), lista), { n: 1, total: 9 });
    assert.deepEqual(L.contextoFrecuencia(deAdultos('pgsi_9'), lista), { n: 9, total: 9 });
  });
});

describe('equivalente en pesos de los tramos', () => {
  const textos = { hasta: 'Hasta {monto}', masDe: 'Más de {monto}', entre: '{desde} a {hasta}', porMes: 'por mes' };
  const p = deAdultos('ingresos_hogar');
  const smvm = 383_800;

  test('primer paso, intermedio y último', () => {
    assert.equal(L.textoPesos(p, 1, smvm, textos), 'Hasta $383.800 por mes');
    assert.equal(L.textoPesos(p, 2, smvm, textos), '$383.800 a $767.600 por mes');
    assert.equal(L.textoPesos(p, 5, smvm, textos), 'Más de $1.919.000 por mes');
  });

  test('sin rangosSmvm (deuda, monto) no se muestran pesos', () => {
    assert.equal(L.textoPesos(deAdultos('deuda_relativa'), 2, smvm, textos), '');
  });
});

describe('opciones agrupadas', () => {
  test('carrera: tres grupos, sin rótulo repetido en «Educación Inicial»', () => {
    const grupos = L.gruposDeOpciones(deAdultos('carrera').opciones);
    assert.deepEqual(
      grupos.map((g) => [g.titulo, g.opciones.length, g.mostrarTitulo]),
      [
        ['Educación Inicial', 1, false],
        ['Profesorados', 3, true],
        ['Tecnicaturas', 5, true],
      ],
    );
  });

  test('sin grupo: un solo grupo sin rótulo (adolescentes no cambia)', () => {
    const grupos = L.gruposDeOpciones(pregunta('en_que_aposto').opciones);
    assert.equal(grupos.length, 1);
    assert.equal(grupos[0].mostrarTitulo, false);
  });
});

describe('pantalla informativa', () => {
  test('no es obligatoria y no cuenta en el progreso', () => {
    const info = defAdultos.preguntas.find((p) => p.tipo === 'info');
    assert.equal(L.esObligatoria(defAdultos, info), false);
    const r = { aposto_12m: 'no' };
    const lista = L.pasos(defAdultos, r);
    const alFinal = L.progreso(defAdultos, r, lista.length, lista);
    assert.equal(alFinal.hechas, alFinal.total);
  });
});

describe('«Prefiero no responder» en escalas', () => {
  test('viaja como texto; los pasos, como número', () => {
    const p = deAdultos('ingresos_hogar');
    const r = { edad: 30, ingresos_hogar: 'prefiero_no_responder' };
    assert.equal(L.cuerpo(defAdultos, r).ingresos_hogar, 'prefiero_no_responder');
    assert.equal(L.cuerpo(defAdultos, { ...r, ingresos_hogar: 2 }).ingresos_hogar, 2);
    assert.ok(L.tieneRespuesta(p, r), 'elegirla cuenta como respondida');
  });
});
