import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validarRespuesta } from '../validacion.js';
import adultos from '../encuestas/adultos.js';
import deprueba from './encuesta-de-prueba.js';
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
  test('acepta una respuesta completa de la rama "sí"', () => {
    const r = validarRespuesta(adultos, adultoQueApuesta());
    assert.equal(r.ok, true);
    assert.equal(r.fila.tipo_apuesta_casino_online, 1);
    assert.equal(r.fila.tipo_apuesta_deportivas, 0);
    assert.equal(r.fila.monto_por_vez, 'entre_10k_50k');
    assert.equal(r.fila.medio_pago_billetera_virtual, 1);
  });

  test('acepta una respuesta completa de la rama "no"; lo que no se preguntó queda en NULL', () => {
    const r = validarRespuesta(adultos, adultoQueNoApuesta());
    assert.equal(r.ok, true);
    assert.equal(r.fila.frecuencia, null);
    assert.equal(r.fila.monto_por_vez, null);
    assert.equal(r.fila.medio_pago_efectivo, null);
    assert.equal(r.fila.donde_recibio_ef_casa, null);
  });

  test('las preguntas de quienes no apuestan quedan en NULL para quienes apuestan', () => {
    const r = validarRespuesta(adultos, adultoQueApuesta());
    assert.equal(r.fila.penso_apostar, null);
    assert.equal(r.fila.canales_publicidad_redes, null);
  });

  test('todas las preguntas visibles son obligatorias', () => {
    const cuerpo = adultoQueApuesta();
    delete cuerpo.carrera;
    delete cuerpo.medio_pago;
    assert.deepEqual(errores(adultos, cuerpo), ['carrera: es obligatoria', 'medio_pago: es obligatoria']);
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

  test('la frecuencia es una sola, no una lista', () => {
    assert.equal(errores(adultos, { ...adultoQueApuesta(), frecuencia: ['diariamente', 'mensualmente'] }).length, 1);
  });

  test('el monto solo acepta los rangos, no un número libre', () => {
    assert.equal(errores(adultos, { ...adultoQueApuesta(), monto_por_vez: 15000 }).length, 1);
  });

  test('no se pueden mezclar respuestas de las dos ramas', () => {
    const cuerpo = { ...adultoQueNoApuesta(), frecuencia: 'semanalmente', medio_pago: ['efectivo'] };
    assert.deepEqual(errores(adultos, cuerpo), [
      'frecuencia: no corresponde a las respuestas anteriores',
      'medio_pago: no corresponde a las respuestas anteriores',
    ]);
  });

  test('«Ninguno» en publicidad no se combina con otros canales', () => {
    const cuerpo = { ...adultoQueNoApuesta(), canales_publicidad: ['redes', 'ninguno'] };
    assert.match(errores(adultos, cuerpo).join(), /exclusiva/);
  });

  test('ya no existen las preguntas que el grupo sacó', () => {
    for (const id of ['ingresos_hogar', 'tiene_deudas', 'pgsi_1', 'aposto_12m']) {
      assert.deepEqual(errores(adultos, { ...adultoQueNoApuesta(), [id]: 1 }), [`${id}: campo desconocido`]);
    }
  });
});

test('rechaza cuerpos que no son un objeto', () => {
  for (const cuerpo of [null, [], 'hola', 42]) {
    assert.equal(validarRespuesta(adolescentes, cuerpo).ok, false);
  }
});

// Formas que hoy no usa ninguna encuesta real: se prueban con la encuesta de prueba.
describe('«Prefiero no responder» en una escala', () => {
  const base = () => ({ edad: 30, carrera: 'datos', ingresos: 2, deuda: 1, usa: 'no' });

  test('se guarda como marca aparte, sin tocar el número', () => {
    const r = validarRespuesta(deprueba, { ...base(), ingresos: 'prefiero_no_responder' });
    assert.equal(r.ok, true);
    assert.equal(r.fila.ingresos, null);
    assert.equal(r.fila.ingresos_no_responde, 1);
  });

  test('si respondió un paso, la marca queda en 0', () => {
    const r = validarRespuesta(deprueba, base());
    assert.equal(r.fila.ingresos, 2);
    assert.equal(r.fila.ingresos_no_responde, 0);
  });

  test('una escala sin esa opción no acepta el texto', () => {
    assert.match(errores(deprueba, { ...base(), deuda: 'prefiero_no_responder' }).join(), /deuda: debe ser un número entero/);
  });

  test('el bloque de frecuencia va de 0 a 3 y solo si corresponde', () => {
    const frec = { frec_1: 0, frec_2: 3, frec_3: 1 };
    assert.equal(validarRespuesta(deprueba, { ...base(), usa: 'si', ...frec }).ok, true);
    assert.equal(errores(deprueba, { ...base(), usa: 'si', ...frec, frec_1: 4 }).length, 1);
    assert.match(errores(deprueba, { ...base(), ...frec }).join(), /no corresponde/);
  });
});
