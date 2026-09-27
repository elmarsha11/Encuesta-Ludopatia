import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { leerVentanas, estadoDeApertura, TOLERANCIA_MINUTOS } from '../ventanas.js';

// Hora argentina (UTC-3) → Date
const ar = (texto) => new Date(`${texto}:00-03:00`);

describe('leerVentanas', () => {
  test('sin configuración → null (siempre abierta)', () => {
    assert.equal(leerVentanas(undefined), null);
    assert.equal(leerVentanas('   '), null);
  });

  test('lee varias ventanas en hora argentina y las ordena', () => {
    const v = leerVentanas('2026-10-20 08:00-12:00; 2026-10-19 13:30-17:00');
    assert.equal(v.length, 2);
    assert.equal(v[0].inicio.toISOString(), '2026-10-19T16:30:00.000Z');
    assert.equal(v[1].fin.toISOString(), '2026-10-20T15:00:00.000Z');
  });

  test('un formato inválido frena el arranque en vez de abrir o cerrar por error', () => {
    assert.throws(() => leerVentanas('19/10 8 a 12'), /formato inválido/);
    assert.throws(() => leerVentanas('2026-10-19 12:00-08:00'), /inválida/);
  });
});

describe('estadoDeApertura', () => {
  const ventanas = leerVentanas('2026-10-19 08:00-12:00; 2026-10-20 08:00-12:00');

  test('dentro de una franja: abierta', () => {
    assert.deepEqual(estadoDeApertura(ventanas, ar('2026-10-19T10:00')), {
      abierta: true,
      aceptaEnvios: true,
      proximaApertura: null,
    });
  });

  test('antes de empezar: cerrada, con la próxima apertura', () => {
    const e = estadoDeApertura(ventanas, ar('2026-10-18T20:00'));
    assert.equal(e.abierta, false);
    assert.equal(e.aceptaEnvios, false);
    assert.equal(e.proximaApertura, ar('2026-10-19T08:00').toISOString());
  });

  test('recién cerrada: no se puede empezar, pero se aceptan envíos durante la tolerancia', () => {
    const e = estadoDeApertura(ventanas, ar('2026-10-19T12:05'));
    assert.equal(e.abierta, false);
    assert.equal(e.aceptaEnvios, true);
    const tarde = new Date(ar('2026-10-19T12:00').getTime() + (TOLERANCIA_MINUTOS + 1) * 60_000);
    assert.equal(estadoDeApertura(ventanas, tarde).aceptaEnvios, false);
  });

  test('después de la última franja: cerrada y sin próxima apertura', () => {
    const e = estadoDeApertura(ventanas, ar('2026-10-21T09:00'));
    assert.equal(e.abierta, false);
    assert.equal(e.proximaApertura, null);
  });

  test('sin ventanas: siempre abierta', () => {
    assert.equal(estadoDeApertura(null, new Date()).abierta, true);
  });
});
