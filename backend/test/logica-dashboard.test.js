// Reglas del dashboard (frontend/resultados/logica.js), probadas con los datos de ejemplo.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../../frontend/resultados/logica.js';

const ejemplo = (nombre) => JSON.parse(readFileSync(new URL(`../../docs/diseno/dashboard/${nombre}`, import.meta.url)));
const grupo = ejemplo('ejemplo-adultos-grupo.json');

describe('reglas del dashboard', () => {
  test('porcentaje entero sobre la base; nada si la cantidad está oculta', () => {
    assert.equal(D.pct(51, 84), 61);
    assert.equal(D.pct(null, 84), null);
  });

  test('una fila de cruce con cualquier celda oculta se trata entera como oculta', () => {
    const fila = { base: 16, oculto: false, celdas: [{ n: null, oculto: true }, { n: 12, oculto: false }] };
    assert.equal(D.filaOculta(fila), true);
  });

  test('«riesgo según deudas» llega entero oculto en el ejemplo', () => {
    assert.equal(D.cruceCompletoOculto(grupo.cruces.find((c) => c.id === 'riesgo_deudas')), true);
    assert.equal(D.cruceCompletoOculto(grupo.cruces.find((c) => c.id === 'aposto_deudas')), false);
  });

  test('la barra apilada solo va si no hay categorías ocultas', () => {
    assert.equal(D.apilable({ oculto: false, celdas: [{ n: 3, oculto: false }, { n: 5, oculto: false }] }), true);
    assert.equal(D.apilable({ oculto: false, celdas: [{ n: null, oculto: true }, { n: 5, oculto: false }] }), false);
  });

  test('la suma de opciones se oculta si alguna está oculta', () => {
    const d = { base: 20, oculto: false, celdas: [{ valor: 'a', n: 8 }, { valor: 'b', n: 7 }, { valor: 'c', n: null, oculto: true }] };
    assert.deepEqual(D.suma(d, ['a', 'b']), { n: 15, oculto: false, base: 20 });
    assert.equal(D.suma(d, ['a', 'c']).oculto, true);
  });

  test('agrupa preguntas por sección y cruces por tema, sin perder ninguna', () => {
    const secciones = D.porSeccion(grupo);
    assert.equal(secciones.reduce((s, x) => s + x.preguntas.length, 0), grupo.distribuciones.length);
    const temas = D.crucesPorTema(grupo);
    assert.equal(temas.reduce((s, t) => s + t.cruces.length, 0), grupo.cruces.length);
    assert.equal(temas[0].titulo, 'Situación económica');
  });

  test('el tramo donde más gente se fue', () => {
    const t = D.tramoMayor([{ seFueron: 1 }, { seFueron: 4 }, { seFueron: 0 }]);
    assert.equal(t.seFueron, 4);
    assert.equal(D.tramoMayor([{ seFueron: 0 }]), null);
  });
});
