// Conexión a la base de datos (SQLite local o Turso en la nube; el código es el mismo).

import { createClient } from '@libsql/client';
import { nombresDeColumnas, sentenciasDeEncuesta } from './esquema.js';

export function crearCliente({ url, authToken }) {
  if (!url) throw new Error('Falta DATABASE_URL (ver .env.example)');
  return createClient({ url, authToken: authToken || undefined });
}

/**
 * Crea las tablas si no existen y verifica que coincidan con las definiciones.
 * Si una tabla ya existía con otras columnas (porque se cambió una pregunta después
 * de empezar a recibir respuestas), el servidor NO arranca: es mejor frenar que
 * guardar datos en columnas equivocadas.
 */
export async function inicializarBase(cliente, encuestas) {
  for (const encuesta of Object.values(encuestas)) {
    await cliente.batch(sentenciasDeEncuesta(encuesta), 'write');

    const info = await cliente.execute(`PRAGMA table_info(${encuesta.tabla})`);
    const existentes = info.rows.map((r) => r.name).filter((n) => n !== 'id' && n !== 'fecha');
    const esperadas = nombresDeColumnas(encuesta);
    if (existentes.join(',') !== esperadas.join(',')) {
      throw new Error(
        `La tabla ${encuesta.tabla} no coincide con la definición de la encuesta. ` +
          'Hacé un backup y revisá los cambios antes de continuar.',
      );
    }
  }
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
