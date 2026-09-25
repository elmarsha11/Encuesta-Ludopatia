import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validarRespuesta } from '../validacion.js';
import adultos, { categoriaPgsi } from '../encuestas/adultos.js';
import adolescentes from '../encuestas/adolescentes.js';
import {
  adultoQueApuesta,
  adultoQueNoApuesta,
  adolescenteQueAposto,
  adolescenteQueNunca,
} from './datos-ejemplo.js';

// Atajo: valida y devuelve los errores (o [] si es válida).
const errores = (encuesta, cuerpo) => validarRespuesta(encuesta, cuerpo).errores ?? [];

describe('adolescentes', () => {
  test('acepta una respuesta completa de la rama "sí"', () => {
    const r = validarRespuesta(adolescentes, adolescenteQueAposto());
    assert.equal(r.ok, true);
    assert.equal(r.fila.en_que_aposto_skins, 1);
    assert.equal(r.fila.en_que_aposto_casino_online, 0);
    assert.equal(r.fila.comentario, 'Me parece bueno que pregunten esto.');
  });

  test('en la rama "nunca", las preguntas de la Sección 3 quedan en NULL, no en 0', () => {
    const r = validarRespuesta(adolescentes, adolescenteQueNunca());
    assert.equal(r.ok, true);
    assert.equal(r.fila.en_que_aposto_skins, null);
    assert.equal(r.fila.frecuencia_ultimo_anio, null);
  });

  test('las preguntas sin responder quedan en NULL (no son obligatorias)', () => {
    const r = validarRespuesta(adolescentes, adolescenteQueNunca());
    assert.equal(r.fila.genero, null);
    assert.equal(r.fila.donde_publicidad_redes, null);
    assert.equal(r.fila.comentario, null);
  });

  test('la edad es obligatoria y va de 12 a 17', () => {
    assert.deepEqual(errores(adolescentes, { ...adolescenteQueNunca(), edad: undefined }), [
      'edad: es obligatoria',
    ]);
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), edad: 11 }).length, 1);
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), edad: 18 }).length, 1);
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), edad: 12 }).length, 0);
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), edad: 17 }).length, 0);
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), edad: 14.5 }).length, 1);
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), edad: '15' }).length, 1);
  });

  test('rechaza preguntas de la Sección 3 si dijo que nunca apostó', () => {
    const cuerpo = { ...adolescenteQueNunca(), en_que_aposto: ['skins'] };
    assert.deepEqual(errores(adolescentes, cuerpo), [
      'en_que_aposto: no corresponde a las respuestas anteriores',
    ]);
  });

  test('"Prefiero no responder" no se combina con otras opciones', () => {
    const cuerpo = { ...adolescenteQueAposto(), en_que_aposto: ['skins', 'prefiero_no_responder'] };
    assert.deepEqual(errores(adolescentes, cuerpo), [
      'en_que_aposto: combina una opción exclusiva con otras',
    ]);
  });

  test('rechaza opciones inexistentes, repetidas y campos desconocidos', () => {
    assert.equal(errores(adolescentes, { ...adolescenteQueAposto(), genero: 'x' }).length, 1);
    assert.equal(
      errores(adolescentes, { ...adolescenteQueAposto(), motivo: ['curiosidad', 'curiosidad'] }).length,
      1,
    );
    assert.deepEqual(errores(adolescentes, { ...adolescenteQueNunca(), nombre: 'Juan' }), [
      'nombre: campo desconocido',
    ]);
  });

  test('escalas: solo enteros de 1 a 5', () => {
    assert.equal(errores(adolescentes, { ...adolescenteQueAposto(), escala_ganar_plata: 0 }).length, 1);
    assert.equal(errores(adolescentes, { ...adolescenteQueAposto(), escala_ganar_plata: 6 }).length, 1);
  });

  test('el comentario tiene un máximo de 1000 caracteres', () => {
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), comentario: 'a'.repeat(1000) }).length, 0);
    assert.equal(errores(adolescentes, { ...adolescenteQueNunca(), comentario: 'a'.repeat(1001) }).length, 1);
  });
});

describe('adultos', () => {
  test('acepta una respuesta completa de la rama "sí" y calcula el PGSI', () => {
    const r = validarRespuesta(adultos, adultoQueApuesta());
    assert.equal(r.ok, true);
    assert.equal(r.fila.pgsi_total, 5);
    assert.equal(r.fila.pgsi_categoria, 'riesgo_moderado');
    assert.equal(r.fila.tipo_apuesta_casino_online, 1);
    assert.equal(r.fila.tipo_apuesta_deportivas, 0);
  });

  test('acepta una respuesta completa de la rama "no"; lo que no se preguntó queda en NULL', () => {
    const r = validarRespuesta(adultos, adultoQueNoApuesta());
    assert.equal(r.ok, true);
    assert.equal(r.fila.pgsi_total, null);
    assert.equal(r.fila.pgsi_1, null);
    assert.equal(r.fila.frecuencia, null);
    assert.equal(r.fila.deuda_relativa, null);
    assert.equal(r.fila.donde_recibio_ef_casa, null);
  });

  test('todas las preguntas visibles son obligatorias', () => {
    const cuerpo = adultoQueApuesta();
    delete cuerpo.carrera;
    delete cuerpo.pgsi_9;
    assert.deepEqual(errores(adultos, cuerpo), ['carrera: es obligatoria', 'pgsi_9: es obligatoria']);
  });

  test('una lista vacía en una múltiple obligatoria cuenta como sin responder', () => {
    assert.deepEqual(errores(adultos, { ...adultoQueApuesta(), motivo: [] }), [
      'motivo: es obligatoria',
    ]);
  });

  test('la edad mínima es 18', () => {
    assert.equal(errores(adultos, { ...adultoQueNoApuesta(), edad: 17 }).length, 1);
    assert.equal(errores(adultos, { ...adultoQueNoApuesta(), edad: 18 }).length, 0);
  });

  test('la deuda relativa solo se responde si tiene deudas', () => {
    assert.deepEqual(errores(adultos, { ...adultoQueNoApuesta(), deuda_relativa: 2 }), [
      'deuda_relativa: no corresponde a las respuestas anteriores',
    ]);
    const sinDeuda = { ...adultoQueApuesta() };
    delete sinDeuda.deuda_relativa;
    assert.deepEqual(errores(adultos, sinDeuda), ['deuda_relativa: es obligatoria']);
  });

  test('no se pueden mezclar respuestas de las dos ramas', () => {
    const cuerpo = { ...adultoQueNoApuesta(), frecuencia: 'semanal', pgsi_1: 3 };
    assert.deepEqual(errores(adultos, cuerpo), [
      'frecuencia: no corresponde a las respuestas anteriores',
      'pgsi_1: no corresponde a las respuestas anteriores',
    ]);
  });

  test('PGSI: cada ítem va de 0 a 3', () => {
    assert.equal(errores(adultos, { ...adultoQueApuesta(), pgsi_4: 4 }).length, 1);
    assert.equal(errores(adultos, { ...adultoQueApuesta(), pgsi_4: -1 }).length, 1);
  });

  test('categorías del PGSI en sus límites', () => {
    assert.equal(categoriaPgsi(0), 'sin_riesgo');
    assert.equal(categoriaPgsi(1), 'riesgo_bajo');
    assert.equal(categoriaPgsi(2), 'riesgo_bajo');
    assert.equal(categoriaPgsi(3), 'riesgo_moderado');
    assert.equal(categoriaPgsi(7), 'riesgo_moderado');
    assert.equal(categoriaPgsi(8), 'juego_problematico');
    assert.equal(categoriaPgsi(27), 'juego_problematico');
  });
});

test('rechaza cuerpos que no son un objeto', () => {
  for (const cuerpo of [null, [], 'hola', 42]) {
    assert.equal(validarRespuesta(adolescentes, cuerpo).ok, false);
  }
});
