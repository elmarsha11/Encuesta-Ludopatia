// Resultados para el dashboard: cálculo, regla de anonimato y embudo.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ocultarCeldas, ocultarDistribucion, ocultarTabla } from '../resultados/anonimato.js';
import { distribuciones, cruce } from '../resultados/agregar.js';
import { embudo } from '../resultados/embudo.js';
import { resultados } from '../resultados/index.js';
import { CONFIGURACION } from '../resultados/configuracion.js';
import { validarRespuesta } from '../validacion.js';
import { crearCliente, inicializarBase, guardarRespuesta, guardarEvento } from '../db/conexion.js';
import { ENCUESTAS } from '../encuestas/index.js';
import adultos from '../encuestas/adultos.js';
import adolescentes from '../encuestas/adolescentes.js';
import { adultoQueApuesta, adultoQueNoApuesta, adolescenteQueAposto, adolescenteQueNunca } from './datos-ejemplo.js';

const celdas = (...ns) => ns.map((n, i) => ({ valor: `v${i}`, n }));
const visibles = (r) => r.map((c) => c.n);

describe('regla de anonimato', () => {
  test('oculta de 1 a 4; el 0 y desde 5 se muestran', () => {
    assert.deepEqual(visibles(ocultarCeldas(celdas(0, 4, 5, 9, 1), { particion: false })), [0, null, 5, 9, null]);
  });

  test('en una partición, una sola celda oculta arrastra a la más chica (si no, se despeja restando)', () => {
    // base 30: se verían 12 y 15, y la oculta sería 30 - 27 = 3
    assert.deepEqual(visibles(ocultarCeldas(celdas(12, 15, 3), { particion: true })), [null, 15, null]);
    // en una opción múltiple las celdas no suman la base: no hace falta
    assert.deepEqual(visibles(ocultarCeldas(celdas(12, 15, 3), { particion: false })), [12, 15, null]);
  });

  test('con base chica se oculta todo, incluida la base', () => {
    const r = ocultarDistribucion(3, celdas(2, 1), { particion: true });
    assert.equal(r.base, null);
    assert.ok(r.celdas.every((c) => c.oculto));
  });

  test('umbral 1 (Juli) no oculta nada', () => {
    assert.deepEqual(visibles(ocultarCeldas(celdas(1, 2, 30), { umbral: 1, particion: true })), [1, 2, 30]);
  });

  test('tablas cruzadas: ninguna fila ni columna queda con UNA sola celda oculta (500 tablas al azar)', () => {
    let semilla = 7;
    const azar = (max) => (semilla = (semilla * 1103515245 + 12345) % 2 ** 31) % max;
    for (let t = 0; t < 500; t++) {
      const nFilas = 2 + azar(3);
      const nColumnas = 2 + azar(2);
      const filas = Array.from({ length: nFilas }, () => {
        const cs = Array.from({ length: nColumnas }, () => ({ n: azar(12) }));
        return { base: cs.reduce((s, c) => s + c.n, 0), celdas: cs };
      });
      const r = ocultarTabla(filas, {});
      r.forEach((f, i) => {
        const ocultas = f.celdas.filter((c) => c.oculto).length;
        if (!f.oculto) assert.notEqual(ocultas, 1, `tabla ${t}, fila ${i}: ${JSON.stringify(filas)}`);
        f.celdas.forEach((c, k) => assert.ok(c.oculto || !(filas[i].celdas[k].n > 0 && filas[i].celdas[k].n < 5)));
      });
      for (let k = 0; k < nColumnas; k++) {
        const ocultas = r.filter((f) => f.celdas[k].oculto).length;
        assert.notEqual(ocultas, 1, `tabla ${t}, columna ${k}: ${JSON.stringify(filas)}`);
      }
    }
  });
});

// Filas como las que guarda la base, generadas desde respuestas válidas.
const fila = (encuesta, cuerpo) => {
  const r = validarRespuesta(encuesta, cuerpo);
  assert.ok(r.ok, r.errores?.join());
  return r.fila;
};
const repetir = (n, crear) => Array.from({ length: n }, (_, i) => crear(i));

const filasAdultos = [
  ...repetir(8, () => fila(adultos, adultoQueApuesta())),
  ...repetir(12, () => fila(adultos, adultoQueNoApuesta())),
  ...repetir(2, () => fila(adultos, { ...adultoQueNoApuesta(), ingresos_hogar: 'prefiero_no_responder' })),
];
const distribucion = (lista, id) => lista.find((d) => d.id === id);

describe('distribuciones', () => {
  const sinOcultar = distribuciones(adultos, filasAdultos, CONFIGURACION.adultos, { umbral: 1 });

  test('la base de una pregunta de rama es solo quien la vio', () => {
    assert.equal(distribucion(sinOcultar, 'aposto_12m').base, 22);
    assert.equal(distribucion(sinOcultar, 'frecuencia').base, 8);
    assert.equal(distribucion(sinOcultar, 'motivo_no_apuesta').base, 14);
  });

  test('«Prefiero no responder» de una escala es una categoría más', () => {
    const ingresos = distribucion(sinOcultar, 'ingresos_hogar');
    assert.equal(ingresos.base, 22);
    assert.equal(ingresos.celdas.find((c) => c.valor === 'prefiero_no_responder').n, 2);
  });

  test('la edad de adultos se muestra agrupada, y el PGSI por categoría', () => {
    assert.deepEqual(distribucion(sinOcultar, 'edad').celdas.map((c) => c.valor), ['18_24', '25_34', '35_mas']);
    assert.equal(distribucion(sinOcultar, 'pgsi_categoria').base, 8);
  });

  test('el comentario libre nunca va al dashboard', () => {
    const lista = distribuciones(adolescentes, [fila(adolescentes, adolescenteQueAposto())], CONFIGURACION.adolescentes, { umbral: 1 });
    assert.equal(distribucion(lista, 'comentario'), undefined);
  });
});

describe('cruces', () => {
  const definicion = CONFIGURACION.adultos.cruces.find((c) => c.id === 'aposto_deudas');

  test('cuenta cada fila del factor por separado', () => {
    const r = cruce(definicion, filasAdultos, CONFIGURACION.adultos.variables, { umbral: 1 });
    const conDeudas = r.filas.find((f) => f.valor === 'si');
    const sinDeudas = r.filas.find((f) => f.valor === 'no');
    // adultoQueApuesta tiene deudas; adultoQueNoApuesta no
    assert.deepEqual([conDeudas.base, ...conDeudas.celdas.map((c) => c.n)], [8, 8, 0]);
    assert.deepEqual([sinDeudas.base, ...sinDeudas.celdas.map((c) => c.n)], [14, 0, 14]);
  });
});

describe('embudo', () => {
  test('cuenta cuántos se fueron entre dos preguntas que ve todo el mundo', () => {
    const conteos = [
      { evento: 'entro', pregunta: null, n: 20 },
      { evento: 'acepto', pregunta: null, n: 18 },
      { evento: 'no_participa', pregunta: null, n: 2 },
      { evento: 'vio', pregunta: 'edad', n: 18 },
      { evento: 'vio', pregunta: 'carrera', n: 17 },
    ];
    const e = embudo(adultos, conteos, 10);
    assert.equal(e.noParticiparon, 2);
    assert.deepEqual(e.tramos[0], { desde: 'Aceptaron participar', hasta: '¿Qué edad tenés?', empezaron: 18, siguieron: 18, seFueron: 0 });
    assert.equal(e.tramos[1].seFueron, 1);
    assert.equal(e.tramos.at(-1).hasta, 'Enviaron la encuesta');
  });
});

describe('resultados desde la base', () => {
  test('arma todo con conteos y nunca incluye una respuesta individual', async () => {
    const db = crearCliente({ url: ':memory:' });
    await inicializarBase(db, ENCUESTAS);
    for (let i = 0; i < 6; i++) {
      await guardarRespuesta(db, adolescentes, fila(adolescentes, { ...adolescenteQueNunca(), comentario: 'texto-que-no-debe-salir' }));
    }
    await guardarEvento(db, adolescentes, { evento: 'entro' });
    await guardarEvento(db, adolescentes, { evento: 'no_participa' });

    const paraDocentes = await resultados(db, adolescentes);
    assert.equal(paraDocentes.respuestas, 6);
    assert.equal(paraDocentes.control, undefined, 'el control es solo para Juli');
    assert.doesNotMatch(JSON.stringify(paraDocentes), /texto-que-no-debe-salir/);

    const paraJuli = await resultados(db, adolescentes, { umbral: 1, control: true });
    assert.equal(paraJuli.control.embudo.noParticiparon, 1);
    assert.equal(paraJuli.control.porDia[0].completaron, 6);
    db.close();
  });
});

describe('configuración de los dashboards', () => {
  test('cada variable apunta a una columna que existe y a valores que existen', () => {
    for (const [id, config] of Object.entries(CONFIGURACION)) {
      const encuesta = ENCUESTAS[id];
      for (const [nombre, variable] of Object.entries(config.variables)) {
        const pregunta = encuesta.preguntas.find((p) => p.id === variable.columna);
        const calculada = config.calculadas.find((c) => c.id === variable.columna);
        assert.ok(pregunta || calculada, `${id}.${nombre}: la columna ${variable.columna} no existe`);
        const validos = pregunta?.opciones?.map((o) => o.valor) ??
          calculada?.categorias.map(([v]) => v) ??
          Array.from({ length: pregunta.max - pregunta.min + 1 }, (_, i) => pregunta.min + i);
        for (const nivel of variable.niveles) {
          const valores = nivel.rango ?? nivel.incluye;
          for (const v of valores) assert.ok(validos.includes(v), `${id}.${nombre}: el valor ${v} no existe en ${variable.columna}`);
        }
      }
      for (const c of config.cruces) {
        assert.ok(config.variables[c.factor] && config.variables[c.resultado], `${id}.${c.id}: variable inexistente`);
      }
    }
  });
});
