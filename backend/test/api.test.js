// Tests de punta a punta: levantan la app real con una base SQLite en memoria
// y le hablan por HTTP, igual que lo hará el frontend.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearApp } from '../app.js';
import { crearCliente, inicializarBase } from '../db/conexion.js';
import { scriptCompleto } from '../db/esquema.js';
import { ENCUESTAS } from '../encuestas/index.js';
import { adultoQueApuesta, adolescenteQueNunca } from './datos-ejemplo.js';

let db;
let servidor;
let base;

const enviar = (encuesta, cuerpo, opciones = {}) =>
  fetch(`${base}/api/respuestas/${encuesta}`, {
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
    assert.equal(rows[0].pgsi_total, 5);
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
