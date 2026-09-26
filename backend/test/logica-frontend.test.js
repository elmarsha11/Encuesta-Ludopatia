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
