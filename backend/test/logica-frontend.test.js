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
import deprueba from './encuesta-de-prueba.js';

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

  test('píxeles: en una franja baja (celular chico) ninguno queda afuera', () => {
    for (const alto of [28, 36, 56]) {
      for (const c of [0, 0.5, 1]) {
        const ys = L.pixeles(c, true, 342, alto).map((px) => px.y);
        assert.ok(Math.max(...ys) <= alto - 6, `con alto ${alto} un píxel quedó en y=${Math.max(...ys)}`);
        assert.ok(Math.min(...ys) >= 0);
      }
    }
  });

  test('píxeles: el desorden del principio también ocupa todo el ancho', () => {
    const angosto = Math.max(...L.pixeles(0, true, 342).map((px) => px.x));
    const ancho = Math.max(...L.pixeles(0, true, 600).map((px) => px.x));
    assert.ok(angosto <= 342 - 6);
    assert.ok(ancho > 500 && ancho <= 600 - 6, `el píxel más a la derecha quedó en ${ancho}`);
  });

  test('dos columnas solo en listas largas donde el orden no significa nada', () => {
    const publicaAdultos = JSON.parse(JSON.stringify(definicionPublica(adultos)));
    const todas = [...publicaAdultos.preguntas, ...def.preguntas];
    const enColumnas = todas.filter(L.enColumnas).map((p) => p.id).sort();
    assert.deepEqual(enColumnas, ['carrera', 'donde_publicidad', 'en_que_aposto', 'medio_pago', 'motivo', 'percepcion_por_que']);
    // La frecuencia es una escala ordenada: aunque sea larga, queda en una columna.
    assert.equal(L.enColumnas(def.preguntas.find((p) => p.id === 'frecuencia_ultimo_anio')), false);
  });

  test('«Parte X de N»: el total no crece cuando se decide una rama', () => {
    const numeros = (r) => {
      const lista = L.pasos(def, r);
      return lista.flatMap((paso, i) => (paso.clase === 'seccion' ? [L.ubicacionSeccion(def, r, i, lista)] : []));
    };
    // Antes de contestar si apostó: la sección de la rama ya está en el total.
    const antes = numeros({ edad: 15 });
    const despues = numeros({ edad: 15, aposto_alguna_vez: 'si_ultimo_anio' });
    assert.equal(antes[0].total, despues[0].total);
    assert.deepEqual(despues.map((u) => u.numero), despues.map((_, i) => i + 1));
    assert.equal(despues.at(-1).numero, despues.at(-1).total);
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

  test('las pantallas informativas no se envían', () => {
    const c = L.cuerpo(defPrueba, { info: 'x', edad: 30 });
    assert.deepEqual(c, { edad: 30 });
  });

  test('adultos: camino "apuesta" completo', () => {
    const defAdultos = JSON.parse(JSON.stringify(definicionPublica(adultos)));
    const r = L.limpiar(defAdultos, {
      edad: '24',
      carrera: 'cufa',
      genero: 'otro',
      situacion_laboral: 'no_trabajo',
      depende_economicamente: 'si',
      alguien_depende: 'no',
      apuesta: 'si',
      frecuencia: 'mensualmente',
      tipo_apuesta: ['deportivas'],
      motivo: ['otra'],
      monto_por_vez: 'menos_10k',
      medio_pago: ['efectivo', 'transferencia'],
      origen_dinero: ['planes_sociales'],
      plataforma_legal: 'si',
      incluyo_a_alguien: 'no',
      penso_apostar: 'si', // de la otra rama: limpiar() lo descarta
      sabe_que_es_ef: 'no',
      recibio_ef: 'no_se',
      quiere_recibir_ef: 'no',
    });
    assert.equal(r.penso_apostar, undefined);
    assert.deepEqual(validarRespuesta(adultos, L.cuerpo(defAdultos, r)).errores, undefined);
  });
});

test('formatearApertura escribe la fecha en hora argentina', () => {
  assert.equal(L.formatearApertura('2026-10-19T11:00:00.000Z'), 'el lunes 19 de octubre a las 08:00');
});

// --- Adultos: de pregunta en pregunta ------------------------------------------

describe('adultos sin portadas de sección', () => {
  const defAdultos = JSON.parse(JSON.stringify(definicionPublica(adultos)));

  test('ningún paso es una portada, en ninguna de las dos ramas', () => {
    for (const apuesta of ['si', 'no']) {
      const lista = L.pasos(defAdultos, { apuesta });
      assert.ok(lista.length > 0);
      assert.ok(lista.every((paso) => paso.clase === 'pregunta'));
    }
  });

  test('educación financiera va al final, en las dos ramas', () => {
    for (const apuesta of ['si', 'no']) {
      const ids = L.pasos(defAdultos, { apuesta }).map((paso) => paso.pregunta.id);
      assert.equal(ids.at(-1), 'quiere_recibir_ef');
    }
  });

  test('las encuestas que no lo piden siguen con portadas', () => {
    assert.ok(L.pasos(def, {}).some((paso) => paso.clase === 'seccion'));
  });
});

// --- Formas de pregunta que hoy no usa ninguna encuesta real (encuesta-de-prueba.js) -

const defPrueba = JSON.parse(JSON.stringify(definicionPublica(deprueba)));
const dePrueba = (id) => defPrueba.preguntas.find((p) => p.id === id);

describe('qué componente dibuja cada escala', () => {
  test('según la forma de la escala, no según la encuesta', () => {
    assert.equal(L.componenteEscala(dePrueba('ingresos')), 'tramos');
    assert.equal(L.componenteEscala(dePrueba('deuda')), 'tramos');
    assert.equal(L.componenteEscala(dePrueba('frec_1')), 'frecuencia');
    const escalaAdolescentes = def.preguntas.find((p) => p.tipo === 'escala');
    assert.equal(L.componenteEscala(escalaAdolescentes), 'puntos');
  });

  test('el contador del bloque de frecuencia va de 1 a N sobre el camino actual', () => {
    const lista = L.pasos(defPrueba, { usa: 'si' });
    assert.deepEqual(L.contextoFrecuencia(dePrueba('frec_1'), lista), { n: 1, total: 3 });
    assert.deepEqual(L.contextoFrecuencia(dePrueba('frec_3'), lista), { n: 3, total: 3 });
  });
});

describe('equivalente en pesos de los tramos', () => {
  const textos = { hasta: 'Hasta {monto}', masDe: 'Más de {monto}', entre: '{desde} a {hasta}', porMes: 'por mes' };
  const p = dePrueba('ingresos');
  const smvm = 383_800;

  test('primer paso, intermedio y último', () => {
    assert.equal(L.textoPesos(p, 1, smvm, textos), 'Hasta $383.800 por mes');
    assert.equal(L.textoPesos(p, 2, smvm, textos), '$383.800 a $767.600 por mes');
    assert.equal(L.textoPesos(p, 5, smvm, textos), 'Más de $1.919.000 por mes');
  });

  test('sin rangosSmvm no se muestran pesos', () => {
    assert.equal(L.textoPesos(dePrueba('deuda'), 2, smvm, textos), '');
  });
});

describe('opciones agrupadas', () => {
  test('tres grupos, sin rótulo repetido en «Educación Inicial»', () => {
    const grupos = L.gruposDeOpciones(dePrueba('carrera').opciones);
    assert.deepEqual(
      grupos.map((g) => [g.titulo, g.opciones.length, g.mostrarTitulo]),
      [
        ['Educación Inicial', 1, false],
        ['Profesorados', 2, true],
        ['Tecnicaturas', 1, true],
      ],
    );
  });

  test('carrera de adultos: las 12 opciones en tres grupos con rótulo', () => {
    const carrera = definicionPublica(adultos).preguntas.find((p) => p.id === 'carrera');
    const grupos = L.gruposDeOpciones(carrera.opciones);
    assert.equal(carrera.opciones.length, 12);
    assert.deepEqual(grupos.map((g) => [g.titulo, g.mostrarTitulo]), [['Profesorados', true], ['Tecnicaturas', true], ['Otras', true]]);
  });

  test('sin grupo: un solo grupo sin rótulo (adolescentes no cambia)', () => {
    const grupos = L.gruposDeOpciones(pregunta('en_que_aposto').opciones);
    assert.equal(grupos.length, 1);
    assert.equal(grupos[0].mostrarTitulo, false);
  });
});

describe('pantalla informativa', () => {
  test('no es obligatoria y no cuenta en el progreso', () => {
    const info = defPrueba.preguntas.find((p) => p.tipo === 'info');
    assert.equal(L.esObligatoria(defPrueba, info), false);
    const r = { usa: 'no' };
    const lista = L.pasos(defPrueba, r);
    const alFinal = L.progreso(defPrueba, r, lista.length, lista);
    assert.equal(alFinal.hechas, alFinal.total);
  });
});

describe('«Prefiero no responder» en escalas', () => {
  test('viaja como texto; los pasos, como número', () => {
    const p = dePrueba('ingresos');
    const r = { edad: 30, ingresos: 'prefiero_no_responder' };
    assert.equal(L.cuerpo(defPrueba, r).ingresos, 'prefiero_no_responder');
    assert.equal(L.cuerpo(defPrueba, { ...r, ingresos: 2 }).ingresos, 2);
    assert.ok(L.tieneRespuesta(p, r), 'elegirla cuenta como respondida');
  });
});
