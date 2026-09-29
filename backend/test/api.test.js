// Tests de punta a punta: levantan la app real con una base SQLite en memoria
// y le hablan por HTTP, igual que lo hará el frontend.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearApp } from '../app.js';
import { crearCliente, inicializarBase, revisarUbicacionDeLaBase, guardarRespuesta } from '../db/conexion.js';
import { scriptCompleto } from '../db/esquema.js';
import { leerVentanas } from '../ventanas.js';
import { ENCUESTAS } from '../encuestas/index.js';
import { adultoQueApuesta, adolescenteQueNunca } from './datos-ejemplo.js';
import deprueba from './encuesta-de-prueba.js';
import { validarRespuesta } from '../validacion.js';

let db;
let servidor;
let base;

const enviar = (encuesta, cuerpo, opciones = {}, ruta = 'respuestas') =>
  fetch(`${base}/api/${ruta}/${encuesta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    ...opciones,
  });

before(async () => {
  db = crearCliente({ url: ':memory:' });
  await inicializarBase(db, ENCUESTAS);
  const app = crearApp({ db, encuestas: ENCUESTAS, limiteEnviosPorMinuto: 1000 });
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.close();
  db.close();
});

describe('POST /api/respuestas/:encuesta', () => {
  test('guarda una respuesta válida de adultos', async () => {
    const res = await enviar('adultos', adultoQueApuesta());
    assert.equal(res.status, 201);
    const { rows } = await db.execute('SELECT * FROM respuestas_adultos');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].carrera, 'tec_adm_financiera');
    assert.equal(rows[0].medio_pago_billetera_virtual, 1);
    assert.equal(rows[0].medio_pago_efectivo, 0);
    assert.equal(rows[0].penso_apostar, null, 'la pregunta de la otra rama queda vacía, no en 0');
    assert.match(rows[0].fecha, /^\d{4}-\d{2}-\d{2}$/, 'la fecha no debe incluir la hora');
  });

  test('guarda una respuesta válida de adolescentes', async () => {
    const res = await enviar('adolescentes', adolescenteQueNunca());
    assert.equal(res.status, 201);
    const { rows } = await db.execute('SELECT * FROM respuestas_adolescentes');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].en_que_aposto_skins, null);
  });

  test('rechaza una respuesta inválida con 400 y no guarda nada', async () => {
    const antes = (await db.execute('SELECT COUNT(*) AS n FROM respuestas_adolescentes')).rows[0].n;
    const res = await enviar('adolescentes', { edad: 30 });
    assert.equal(res.status, 400);
    const cuerpo = await res.json();
    assert.equal(cuerpo.ok, false);
    assert.ok(cuerpo.errores.length > 0);
    const despues = (await db.execute('SELECT COUNT(*) AS n FROM respuestas_adolescentes')).rows[0].n;
    assert.equal(despues, antes);
  });

  test('encuesta inexistente → 404', async () => {
    const res = await enviar('otra', {});
    assert.equal(res.status, 404);
  });

  test('JSON mal formado → 400', async () => {
    const res = await enviar('adultos', '{ esto no es json');
    assert.equal(res.status, 400);
  });

  test('envío gigante → 413', async () => {
    const res = await enviar('adolescentes', { edad: 15, comentario: 'a'.repeat(50_000) });
    assert.equal(res.status, 413);
  });

  test('agrega encabezados de seguridad (helmet)', async () => {
    const res = await enviar('adolescentes', adolescenteQueNunca());
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });
});

describe('GET /api/encuestas/:encuesta', () => {
  test('devuelve la definición pública, sin detalles internos', async () => {
    const res = await fetch(`${base}/api/encuestas/adultos`);
    assert.equal(res.status, 200);
    const def = await res.json();
    assert.equal(def.id, 'adultos');
    assert.ok(def.preguntas.length > 0);
    assert.equal(def.tabla, undefined, 'no debe exponer el nombre de la tabla');
    assert.equal(def.portadasDeSeccion, false);
    const donde = def.preguntas.find((p) => p.id === 'donde_recibio_ef');
    assert.deepEqual(donde.visibleSi, { pregunta: 'recibio_ef', es: ['si'] });
  });

  test('encuesta inexistente → 404', async () => {
    const res = await fetch(`${base}/api/encuestas/otra`);
    assert.equal(res.status, 404);
  });
});

describe('POST /api/eventos/:encuesta', () => {
  const evento = (id, cuerpo) => enviar(id, cuerpo, {}, 'eventos');

  test('guarda cada evento como una fila suelta, sin respuestas ni identificadores', async () => {
    assert.equal((await evento('adolescentes', { evento: 'no_participa' })).status, 204);
    assert.equal((await evento('adultos', { evento: 'vio', pregunta: 'medio_pago' })).status, 204);
    const { rows } = await db.execute("SELECT * FROM eventos WHERE encuesta = 'adultos' AND evento = 'vio'");
    assert.deepEqual(Object.keys(rows[0]).sort(), ['encuesta', 'evento', 'fecha', 'id', 'pregunta']);
    assert.equal(rows[0].pregunta, 'medio_pago');
    assert.match(rows[0].fecha, /^\d{4}-\d{2}-\d{2}$/, 'solo la fecha, sin hora');
  });

  test('rechaza eventos inventados y preguntas de otra encuesta', async () => {
    assert.equal((await evento('adultos', { evento: 'hackeo' })).status, 400);
    assert.equal((await evento('adultos', { evento: 'vio', pregunta: 'comentario' })).status, 400);
    assert.equal((await evento('adultos', { evento: 'vio' })).status, 400);
    assert.equal((await evento('adultos', { evento: 'entro', pregunta: 'edad' })).status, 400);
    assert.equal((await evento('adultos', { evento: 'entro', edad: 30 })).status, 400);
    assert.equal((await evento('nada', { evento: 'entro' })).status, 404);
  });

  test('los eventos tampoco se pueden modificar ni borrar', async () => {
    await assert.rejects(db.execute("UPDATE eventos SET evento = 'acepto'"), /no se pueden modificar/);
    await assert.rejects(db.execute('DELETE FROM eventos'), /no se pueden borrar/);
  });
});

describe('ventanas de apertura', () => {
  // App aparte con un reloj fijo, para simular "antes", "durante" y "después".
  async function appConReloj(hora) {
    const dbLocal = crearCliente({ url: ':memory:' });
    await inicializarBase(dbLocal, ENCUESTAS);
    const app = crearApp({
      db: dbLocal,
      encuestas: ENCUESTAS,
      ventanas: { adolescentes: leerVentanas('2026-10-19 08:00-12:00') },
      reloj: () => new Date(`${hora}:00-03:00`),
    });
    const srv = app.listen(0);
    await new Promise((r) => srv.once('listening', r));
    const url = `http://127.0.0.1:${srv.address().port}`;
    return { url, db: dbLocal, cerrar: () => (srv.close(), dbLocal.close()) };
  }

  test('fuera de horario: la definición dice cerrada y el envío se rechaza con 403', async () => {
    const { url, cerrar } = await appConReloj('2026-10-18T20:00');
    try {
      const def = await (await fetch(`${url}/api/encuestas/adolescentes`)).json();
      assert.equal(def.abierta, false);
      assert.ok(def.proximaApertura);
      const res = await fetch(`${url}/api/respuestas/adolescentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adolescenteQueNunca()),
      });
      assert.equal(res.status, 403);
      assert.equal((await res.json()).cerrada, true);
      // Adultos no tiene ventanas configuradas: sigue abierta.
      const defAdultos = await (await fetch(`${url}/api/encuestas/adultos`)).json();
      assert.equal(defAdultos.abierta, true);
    } finally {
      cerrar();
    }
  });

  test('fuera de horario los eventos se ignoran (204, sin guardar)', async () => {
    const { url, db: dbLocal, cerrar } = await appConReloj('2026-10-18T20:00');
    try {
      const res = await fetch(`${url}/api/eventos/adolescentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento: 'entro' }),
      });
      assert.equal(res.status, 204);
      const { rows } = await dbLocal.execute('SELECT COUNT(*) AS n FROM eventos');
      assert.equal(rows[0].n, 0);
    } finally {
      cerrar();
    }
  });

  test('dentro del horario: acepta envíos', async () => {
    const { url, cerrar } = await appConReloj('2026-10-19T09:00');
    try {
      const res = await fetch(`${url}/api/respuestas/adolescentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adolescenteQueNunca()),
      });
      assert.equal(res.status, 201);
    } finally {
      cerrar();
    }
  });
});

describe('páginas', () => {
  test('sirve la encuesta de adolescentes con su tema y el motor', async () => {
    const html = await fetch(`${base}/adolescentes/`);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /<main class="app">/);
    assert.equal((await fetch(`${base}/adolescentes/tema-a.css`)).status, 200);
    assert.equal((await fetch(`${base}/motor/motor.js`)).status, 200);
    const fuente = await fetch(`${base}/adolescentes/fuentes/space-grotesk-latin-wght-normal.woff2`);
    assert.equal(fuente.status, 200);
  });

  test('sirve la encuesta de adultos con su tema y sus tipografías', async () => {
    const html = await fetch(`${base}/adultos/`);
    assert.equal(html.status, 200);
    const texto = await html.text();
    assert.match(texto, /<main class="app">/);
    assert.match(texto, /tema-b\.css/);
    assert.equal((await fetch(`${base}/adultos/tema-b.css`)).status, 200);
    assert.equal((await fetch(`${base}/adultos/fuentes/newsreader-latin-wght-normal.woff2`)).status, 200);
    assert.equal((await fetch(`${base}/adultos/fuentes/instrument-sans-latin-wght-normal.woff2`)).status, 200);
  });

  test('la política de seguridad solo permite recursos del propio servidor', async () => {
    const res = await fetch(`${base}/adolescentes/`);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /font-src 'self'/);
    assert.doesNotMatch(csp, /https:/);
  });
});

describe('protección de los datos', () => {
  test('la base no permite modificar respuestas', async () => {
    await assert.rejects(
      db.execute("UPDATE respuestas_adultos SET carrera = 'prof_ingles'"),
      /no se pueden modificar/,
    );
  });

  test('la base no permite borrar respuestas', async () => {
    await assert.rejects(db.execute('DELETE FROM respuestas_adultos'), /no se pueden borrar/);
  });

  test('la base rechaza un número junto con la marca de «prefiero no responder»', async () => {
    const dbPrueba = crearCliente({ url: ':memory:' });
    await inicializarBase(dbPrueba, { prueba: deprueba });
    const valida = validarRespuesta(deprueba, { edad: 30, carrera: 'datos', ingresos: 'prefiero_no_responder', deuda: 1, usa: 'no' });
    assert.equal(valida.ok, true);
    await guardarRespuesta(dbPrueba, deprueba, valida.fila);
    const { rows } = await dbPrueba.execute('SELECT * FROM respuestas_prueba');
    const fila = { ...rows[0], ingresos: 3, ingresos_no_responde: 1 };
    const columnas = Object.keys(fila).filter((c) => c !== 'id');
    await assert.rejects(
      dbPrueba.execute({
        sql: `INSERT INTO respuestas_prueba (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
        args: columnas.map((c) => fila[c]),
      }),
      /CHECK constraint failed/,
    );
    dbPrueba.close();
  });

  test('la base rechaza valores fuera de rango aunque el validador fallara', async () => {
    await assert.rejects(
      db.execute("INSERT INTO respuestas_adolescentes (edad) VALUES (40)"),
      /CHECK constraint failed/,
    );
  });
});

describe('límite de envíos', () => {
  test('pasado el límite por minuto responde 429', async () => {
    const dbLocal = crearCliente({ url: ':memory:' });
    await inicializarBase(dbLocal, ENCUESTAS);
    const app = crearApp({ db: dbLocal, encuestas: ENCUESTAS, limiteEnviosPorMinuto: 2 });
    const srv = app.listen(0);
    await new Promise((r) => srv.once('listening', r));
    const url = `http://127.0.0.1:${srv.address().port}/api/respuestas/adolescentes`;
    const post = () =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adolescenteQueNunca()),
      });
    try {
      assert.equal((await post()).status, 201);
      assert.equal((await post()).status, 201);
      assert.equal((await post()).status, 429);
    } finally {
      srv.close();
      dbLocal.close();
    }
  });
});

test('en Render no se acepta una base en archivo local (el disco se borra al dormirse)', () => {
  assert.throws(() => revisarUbicacionDeLaBase('file:encuestas.db', { RENDER: 'true' }), /Turso/);
  assert.doesNotThrow(() => revisarUbicacionDeLaBase('libsql://encuestas-juli.turso.io', { RENDER: 'true' }));
  // En la PC (sin la variable RENDER) el archivo local es lo normal.
  assert.doesNotThrow(() => revisarUbicacionDeLaBase('file:encuestas.db', {}));
});

test('salud: responde sin tocar la base de datos', async () => {
  // Una base que falla en cualquier consulta: si /api/salud la tocara, respondería 500.
  const rota = { execute: () => Promise.reject(new Error('no debería consultarse')), batch: () => Promise.reject(new Error('no')) };
  const app = crearApp({ db: rota, encuestas: ENCUESTAS });
  const servidor = app.listen(0);
  const { port } = servidor.address();
  const res = await fetch(`http://localhost:${port}/api/salud`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  servidor.close();
});

test('database/schema.sql está actualizado con las definiciones (correr `npm run schema`)', () => {
  const enDisco = readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8');
  assert.equal(enDisco, scriptCompleto(ENCUESTAS));
});

test('el servidor no arranca si una tabla existente no coincide con la definición', async () => {
  const dbVieja = crearCliente({ url: ':memory:' });
  await dbVieja.execute('CREATE TABLE respuestas_adultos (id INTEGER PRIMARY KEY, fecha TEXT, edad INTEGER)');
  await assert.rejects(inicializarBase(dbVieja, ENCUESTAS), /no coincide/);
  dbVieja.close();
});

test('el servidor no arranca si cambiaron las opciones de una pregunta (misma columna, otros valores)', async () => {
  // El caso silencioso: agregar una opción no cambia los nombres de las columnas, pero la
  // base guardó qué valores acepta. Si arrancara, rechazaría a quien elija la opción nueva.
  const db = crearCliente({ url: ':memory:' });
  await inicializarBase(db, ENCUESTAS);
  const e = ENCUESTAS.adolescentes;
  const unica = e.preguntas.find((p) => p.tipo === 'unica');
  const cambiada = {
    ...e,
    preguntas: e.preguntas.map((p) => (p === unica ? { ...p, opciones: [...p.opciones, { valor: 'nueva', texto: 'Nueva' }] } : p)),
  };
  await assert.rejects(inicializarBase(db, { ...ENCUESTAS, adolescentes: cambiada }), /opciones/);
  // Con las definiciones de siempre sigue arrancando (reiniciar no es un cambio).
  await inicializarBase(db, ENCUESTAS);
  db.close();
});
