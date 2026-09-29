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

  test('un cruce con todas las filas ocultas se trata entero como oculto', () => {
    const oculta = { base: null, oculto: true, celdas: [{ n: null, oculto: true }, { n: null, oculto: true }] };
    const visible = { base: 20, oculto: false, celdas: [{ n: 8, oculto: false }, { n: 12, oculto: false }] };
    assert.equal(D.cruceCompletoOculto({ filas: [oculta, oculta] }), true);
    assert.equal(D.cruceCompletoOculto({ filas: [oculta, visible] }), false);
    assert.equal(D.cruceCompletoOculto(grupo.cruces.find((c) => c.id === 'aposto_genero')), false);
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
    assert.equal(temas[0].titulo, 'Quiénes apuestan');
  });

  test('el tramo donde más gente se fue', () => {
    const t = D.tramoMayor([{ seFueron: 1 }, { seFueron: 4 }, { seFueron: 0 }]);
    assert.equal(t.seFueron, 4);
    assert.equal(D.tramoMayor([{ seFueron: 0 }]), null);
  });

  test('índice: se enciende la última sección que cruzó la línea de lectura', () => {
    const secciones = [
      { id: 'hallazgos', arriba: -900 },
      { id: 'tema-0', arriba: -200 },
      { id: 'seccion-a', arriba: 150 },
      { id: 'seccion-b', arriba: 1400 },
    ];
    assert.equal(D.seccionActiva(secciones, { linea: 240, alFondo: false }), 'seccion-a');
    assert.equal(D.seccionActiva(secciones, { linea: 100, alFondo: false }), 'tema-0');
    // Arriba de todo, antes de que la primera llegue a la línea: igual se enciende la primera.
    assert.equal(D.seccionActiva([{ id: 'x', arriba: 500 }, { id: 'y', arriba: 900 }], { linea: 240, alFondo: false }), 'x');
    // Al final de la página gana la última aunque no haya subido hasta la línea.
    assert.equal(D.seccionActiva(secciones, { linea: 240, alFondo: true }), 'seccion-b');
    assert.equal(D.seccionActiva([], { linea: 240, alFondo: false }), null);
  });

  test('anillo: una porción por parte, desde las cantidades, y el resto en el riel', () => {
    assert.equal(D.anillo([{ n: 32, color: 'a' }], 84, 'r'), 'conic-gradient(a 0% 38.095%, r 38.095% 100%)');
    assert.equal(
      D.anillo([{ n: 1, color: 'a' }, { n: 1, color: 'b' }, { n: 2, color: 'c' }], 4, 'r'),
      'conic-gradient(a 0% 25%, b 25% 50%, c 50% 100%)',
    );
    assert.equal(D.anillo([{ n: 0, color: 'a' }], 0, 'r'), 'conic-gradient(a 0% 0%, r 0% 100%)');
  });
});
