// Backup: copia una base entera (Turso o archivo) a un archivo SQLite nuevo.
//
// La copia tiene las mismas tablas, reglas y filas (con su id y su fecha originales),
// así que se puede usar directamente: como DATABASE_URL del servidor o con
// `npm run resultados`. Al final se comparan las cantidades de filas de cada tabla.

import { inicializarBase } from './conexion.js';

const LOTE = 200; // filas por escritura: pocas idas y vueltas sin armar sentencias gigantes

/**
 * @param {import('@libsql/client').Client} origen
 * @param {import('@libsql/client').Client} destino - base vacía
 * @returns {Promise<Record<string, number>>} filas copiadas por tabla
 */
export async function respaldar(origen, destino, encuestas) {
  await inicializarBase(destino, encuestas);
  const tablas = [...Object.values(encuestas).map((e) => e.tabla), 'eventos'];
  const copiadas = {};

  for (const tabla of tablas) {
    const { rows, columns } = await origen.execute(`SELECT * FROM ${tabla} ORDER BY id`);
    const sql = `INSERT INTO ${tabla} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    for (let i = 0; i < rows.length; i += LOTE) {
      const lote = rows.slice(i, i + LOTE).map((fila) => ({ sql, args: columns.map((c) => fila[c]) }));
      await destino.batch(lote, 'write');
    }
    const enOrigen = rows.length;
    const enCopia = Number((await destino.execute(`SELECT COUNT(*) AS n FROM ${tabla}`)).rows[0].n);
    if (enCopia !== enOrigen) throw new Error(`La copia de ${tabla} quedó incompleta: ${enCopia} de ${enOrigen} filas.`);
    copiadas[tabla] = enCopia;
  }
  return copiadas;
}
