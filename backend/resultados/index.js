// Resultados de una encuesta, listos para el dashboard. Es la ÚNICA puerta de salida
// de los datos hacia el dashboard: lee las filas en el servidor y devuelve conteos.

import { CONFIGURACION } from './configuracion.js';
import { distribuciones, cruce } from './agregar.js';
import { embudo } from './embudo.js';
import { UMBRAL } from './anonimato.js';

/**
 * @param {import('@libsql/client').Client} db
 * @param {object} encuesta
 * @param {{ umbral?: number, control?: boolean }} [opciones]
 *   umbral: desde cuántas respuestas se muestra una cantidad (1 = todo, solo para Juli).
 *   control: incluir el embudo de participación y las respuestas por día (solo Juli).
 */
export async function resultados(db, encuesta, { umbral = UMBRAL, control = false } = {}) {
  const config = CONFIGURACION[encuesta.id];
  const { rows: filas } = await db.execute(`SELECT * FROM ${encuesta.tabla}`);

  const datos = {
    encuesta: encuesta.id,
    titulo: encuesta.titulo,
    umbral,
    respuestas: filas.length,
    secciones: encuesta.secciones.map(({ id, titulo }) => ({ id, titulo })),
    distribuciones: distribuciones(encuesta, filas, config, { umbral }),
    cruces: config.cruces.map((c) => cruce(c, filas, config.variables, { umbral })),
  };

  if (control) {
    const eventos = await db.execute({
      sql: 'SELECT evento, pregunta, COUNT(*) AS n FROM eventos WHERE encuesta = ? GROUP BY evento, pregunta',
      args: [encuesta.id],
    });
    const porDiaRespuestas = await db.execute(`SELECT fecha, COUNT(*) AS n FROM ${encuesta.tabla} GROUP BY fecha`);
    const porDiaEntradas = await db.execute({
      sql: "SELECT fecha, COUNT(*) AS n FROM eventos WHERE encuesta = ? AND evento = 'entro' GROUP BY fecha",
      args: [encuesta.id],
    });
    const fechas = [...new Set([...porDiaRespuestas.rows, ...porDiaEntradas.rows].map((r) => r.fecha))].sort();
    const de = (resultado, fecha) => resultado.rows.find((r) => r.fecha === fecha)?.n ?? 0;
    datos.control = {
      embudo: embudo(encuesta, eventos.rows, filas.length),
      porDia: fechas.map((fecha) => ({ fecha, entraron: de(porDiaEntradas, fecha), completaron: de(porDiaRespuestas, fecha) })),
    };
  }
  return datos;
}
