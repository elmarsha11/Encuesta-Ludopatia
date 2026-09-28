// Conexión a la base de datos (SQLite local o Turso en la nube; el código es el mismo).

import { createClient } from '@libsql/client';
import { nombresDeColumnas, sentenciasDeEncuesta, sentenciasDeEventos } from './esquema.js';

/**
 * En Render el disco se borra cada vez que el servidor gratuito se duerme (15 minutos sin
 * visitas). Una base en archivo local perdería TODAS las respuestas sin avisar: ahí solo
 * se acepta una base en la nube (Turso). Render define la variable RENDER en sus servidores.
 */
export function revisarUbicacionDeLaBase(url, entorno = process.env) {
  if (entorno.RENDER && String(url).startsWith('file:')) {
    throw new Error(
      'DATABASE_URL apunta a un archivo local, pero el servidor corre en Render: el disco se borra ' +
        'cada vez que se duerme y se perderían las respuestas. Usá la base de Turso (libsql://...).',
    );
  }
}

export function crearCliente({ url, authToken }) {
  if (!url) throw new Error('Falta DATABASE_URL (ver .env.example)');
  return createClient({ url, authToken: authToken || undefined });
}

/**
 * Crea las tablas si no existen y verifica que coincidan EXACTAMENTE con las definiciones.
 * Si una tabla ya existía con otra forma (porque se cambió una pregunta después de empezar
 * a recibir respuestas), el servidor NO arranca: es mejor frenar que guardar datos en
 * columnas equivocadas o rechazar en silencio a quien elija una opción nueva.
 */
export async function inicializarBase(cliente, encuestas) {
  for (const encuesta of Object.values(encuestas)) {
    const sentencias = sentenciasDeEncuesta(encuesta);
    await cliente.batch(sentencias, 'write');
    await verificarTabla(cliente, encuesta.tabla, sentencias[0], nombresDeColumnas(encuesta));
  }
  const deEventos = sentenciasDeEventos(encuestas);
  await cliente.batch(deEventos, 'write');
  await verificarTabla(cliente, 'eventos', deEventos[0]);
}

/**
 * SQLite guarda el CREATE TABLE tal cual se escribió (sin el «IF NOT EXISTS»), con los
 * CHECK que dicen qué valores acepta cada columna. Compararlo entero detecta también un
 * cambio de opciones, que no cambia los nombres de las columnas.
 */
async function verificarTabla(cliente, tabla, crear, columnasEsperadas) {
  const r = await cliente.execute({ sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", args: [tabla] });
  const guardada = r.rows[0]?.sql;
  if (guardada === crear.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE')) return;

  let motivo = 'cambiaron las opciones o las reglas de alguna pregunta';
  if (columnasEsperadas) {
    const info = await cliente.execute(`PRAGMA table_info(${tabla})`);
    const existentes = info.rows.map((c) => c.name).filter((n) => n !== 'id' && n !== 'fecha');
    if (existentes.join(',') !== columnasEsperadas.join(',')) motivo = 'se agregaron, quitaron o renombraron preguntas';
  }
  throw new Error(
    `La tabla ${tabla} no coincide con la definición de la encuesta: ${motivo}. ` +
      'Las respuestas ya guardadas usan la forma anterior. Hacé un backup y revisá los cambios antes de continuar.',
  );
}

/** Registra un evento validado (una fila suelta, sin nada que la una a otra). */
export async function guardarEvento(cliente, encuesta, { evento, pregunta }) {
  await cliente.execute({
    sql: 'INSERT INTO eventos (encuesta, evento, pregunta) VALUES (?, ?, ?)',
    args: [encuesta.id, evento, pregunta ?? null],
  });
}

/** Inserta una fila validada. Los valores van como parámetros (?) y nunca pegados al SQL. */
export async function guardarRespuesta(cliente, encuesta, fila) {
  const columnas = nombresDeColumnas(encuesta);
  const marcadores = columnas.map(() => '?').join(', ');
  await cliente.execute({
    sql: `INSERT INTO ${encuesta.tabla} (${columnas.join(', ')}) VALUES (${marcadores})`,
    args: columnas.map((c) => fila[c] ?? null),
  });
}
