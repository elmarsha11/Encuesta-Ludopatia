// Acceso a los resultados: contraseñas, sesiones, permisos por rol y Excel.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { crearAcceso, revisarClaves } from '../acceso.js';
import { crearApp } from '../app.js';
import { crearCliente, inicializarBase, guardarRespuesta } from '../db/conexion.js';
import { ENCUESTAS } from '../encuestas/index.js';
import { validarRespuesta } from '../validacion.js';
import { adultoQueApuesta, adolescenteQueNunca } from './datos-ejemplo.js';

const CLAVES = { juli: 'clave-de-juli-larga', adultos: 'clave-del-grupo-larga', docentes: '' };

describe('contraseñas y sesiones', () => {
  test('cada contraseña da su rol; una vacía deja ese acceso deshabilitado', () => {
    const a = crearAcceso({ claves: CLAVES });
    assert.equal(a.rolDeClave('clave-de-juli-larga'), 'juli');
    assert.equal(a.rolDeClave('clave-del-grupo-larga'), 'adultos');
    assert.equal(a.rolDeClave(''), null);
    assert.equal(a.rolDeClave('cualquier-cosa'), null);
    assert.deepEqual(a.habilitados(), ['juli', 'adultos']);
  });

  test('la sesión vence', () => {
    let ahora = 1_000;
    const a = crearAcceso({ claves: CLAVES, duracionMs: 500, reloj: () => ahora });
    const token = a.abrirSesion('adultos');
    assert.equal(a.sesion(token).rol, 'adultos');
    ahora += 600;
    assert.equal(a.sesion(token), null);
  });

  test('avisa si una contraseña es corta o está repetida', () => {
    assert.equal(revisarClaves({ juli: 'corta' }).length, 1);
    assert.equal(revisarClaves({ juli: 'misma-clave-larga', adultos: 'misma-clave-larga' }).length, 1);
  });
});

describe('API de resultados', () => {
  let servidor;
  let base;
  let db;

  before(async () => {
    db = crearCliente({ url: ':memory:' });
    await inicializarBase(db, ENCUESTAS);
    for (let i = 0; i < 6; i++) {
      await guardarRespuesta(db, ENCUESTAS.adultos, validarRespuesta(ENCUESTAS.adultos, adultoQueApuesta()).fila);
      await guardarRespuesta(db, ENCUESTAS.adolescentes, validarRespuesta(ENCUESTAS.adolescentes, { ...adolescenteQueNunca(), comentario: 'comentario-privado' }).fila);
    }
    const app = crearApp({ db, encuestas: ENCUESTAS, acceso: crearAcceso({ claves: CLAVES }) });
    servidor = app.listen(0);
    await new Promise((r) => servidor.once('listening', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
  });

  after(() => {
    servidor.close();
    db.close();
  });

  const ingresar = async (clave) => {
    const res = await fetch(`${base}/api/acceso`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }) });
    return { res, cookie: res.headers.get('set-cookie')?.split(';')[0] };
  };
  const pedir = (ruta, cookie) => fetch(`${base}${ruta}`, { headers: cookie ? { cookie } : {} });

  test('sin sesión no hay datos', async () => {
    const res = await pedir('/api/resultados/adultos');
    assert.equal(res.status, 401);
    assert.equal((await res.json()).sesionVencida, true);
  });

  test('contraseña incorrecta → 401, sin cookie', async () => {
    const { res, cookie } = await ingresar('no-es-esta');
    assert.equal(res.status, 401);
    assert.equal(cookie, undefined);
  });

  test('la cookie de sesión es HttpOnly y SameSite=Strict', async () => {
    const { res } = await ingresar('clave-del-grupo-larga');
    const setCookie = res.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
  });

  test('el grupo ve adultos con la regla de anonimato y sin control; no ve adolescentes', async () => {
    const { cookie } = await ingresar('clave-del-grupo-larga');
    const res = await pedir('/api/resultados/adultos', cookie);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const datos = await res.json();
    assert.equal(datos.umbral, 5);
    assert.equal(datos.control, undefined);
    assert.equal((await pedir('/api/resultados/adolescentes', cookie)).status, 404);
  });

  test('Juli ve todo, sin ocultar, con el control', async () => {
    const { cookie } = await ingresar('clave-de-juli-larga');
    const sesion = await (await pedir('/api/sesion', cookie)).json();
    assert.deepEqual(sesion.encuestas, ['adultos', 'adolescentes']);
    const datos = await (await pedir('/api/resultados/adolescentes', cookie)).json();
    assert.equal(datos.umbral, 1);
    assert.ok(datos.control.embudo);
    assert.doesNotMatch(JSON.stringify(datos), /comentario-privado/, 'el comentario no va al dashboard, ni siquiera para Juli');
  });

  test('Excel: el del grupo no tiene filas por persona; el de Juli sí, con el comentario', async () => {
    const leer = async (res) => {
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(Buffer.from(await res.arrayBuffer()));
      return libro;
    };
    const grupo = await ingresar('clave-del-grupo-larga');
    const resGrupo = await pedir('/api/exportar/adultos', grupo.cookie);
    assert.equal(resGrupo.status, 200);
    assert.match(resGrupo.headers.get('content-disposition'), /resultados-adultos\.xlsx/);
    const hojasGrupo = (await leer(resGrupo)).worksheets.map((h) => h.name);
    assert.deepEqual(hojasGrupo, ['Resumen', 'Preguntas', 'Cruces']);

    const juli = await ingresar('clave-de-juli-larga');
    const libroJuli = await leer(await pedir('/api/exportar/adolescentes', juli.cookie));
    assert.deepEqual(libroJuli.worksheets.map((h) => h.name), ['Resumen', 'Preguntas', 'Cruces', 'Respuestas', 'Diccionario', 'Participación']);
    const respuestas = libroJuli.getWorksheet('Respuestas');
    assert.equal(respuestas.rowCount, 7, 'encabezado + 6 respuestas');
    const columnaComentario = respuestas.getRow(1).values.indexOf('comentario');
    assert.equal(respuestas.getRow(2).getCell(columnaComentario).value, 'comentario-privado');
  });

  test('salir invalida la sesión', async () => {
    const { cookie } = await ingresar('clave-de-juli-larga');
    assert.equal((await fetch(`${base}/api/salir`, { method: 'POST', headers: { cookie } })).status, 204);
    assert.equal((await pedir('/api/sesion', cookie)).status, 401);
  });

  test('pasados 10 intentos, el acceso se frena un rato', async () => {
    const respuestas = [];
    for (let i = 0; i < 12; i++) respuestas.push((await ingresar('intento-equivocado')).res.status);
    assert.ok(respuestas.includes(429));
  });
});

test('detrás del proxy de Render (TRUST_PROXY=1), la cookie de sesión sale marcada Secure', async () => {
  // Render recibe HTTPS y le pasa al servidor HTTP común, avisando en X-Forwarded-Proto.
  // Con trustProxy el servidor lo cree y marca la cookie para que solo viaje cifrada.
  const db = crearCliente({ url: ':memory:' });
  await inicializarBase(db, ENCUESTAS);
  const cookieCon = async (trustProxy) => {
    const app = crearApp({ db, encuestas: ENCUESTAS, trustProxy, acceso: crearAcceso({ claves: CLAVES }) });
    const servidor = app.listen(0);
    await new Promise((r) => servidor.once('listening', r));
    const res = await fetch(`http://127.0.0.1:${servidor.address().port}/api/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
      body: JSON.stringify({ clave: CLAVES.juli }),
    });
    servidor.close();
    return res.headers.get('set-cookie');
  };
  assert.match(await cookieCon(1), /;\s*Secure/i);
  // Sin confiar en el proxy, el encabezado se ignora (cualquiera podría inventarlo).
  assert.doesNotMatch(await cookieCon(false), /;\s*Secure/i);
  db.close();
});
