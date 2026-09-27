// Exportación a Excel.
//
// Dos versiones (docs/PLAN-encuesta-ludopatia.md, 8.4):
// - Resultados (grupo y docentes): las mismas tablas del dashboard, con la regla de
//   anonimato ya aplicada. Nunca una fila por persona: edad + carrera + género alcanzan
//   para reconocer a un compañero de una carrera chica.
// - Completa (solo Juli): además, las respuestas crudas (una fila por encuesta, incluido
//   el comentario libre), un diccionario de columnas y la participación.

import ExcelJS from 'exceljs';
import { columnaDeOpcion, columnaNoResponde, preguntasConRespuesta } from '../validacion.js';
import { nombresDeColumnas } from '../db/esquema.js';

const ENCABEZADO = { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFE7D8' } } };
const porcentaje = (n, base) => (n === null || !base ? null : n / base);

function hoja(libro, nombre, columnas) {
  const h = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
  h.columns = columnas;
  Object.assign(h.getRow(1), ENCABEZADO);
  h.getRow(1).font = ENCABEZADO.font;
  h.getRow(1).fill = ENCABEZADO.fill;
  return h;
}

// Una cantidad oculta se escribe como texto, para que nadie la confunda con un 0.
const OCULTO = 'oculto (< 5)';
const cantidad = (c) => (c.oculto ? OCULTO : c.n);

function hojasDeResultados(libro, r) {
  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [{ width: 36 }, { width: 70 }];
  resumen.addRows([
    ['Encuesta', r.titulo],
    ['Respuestas completas', r.respuestas],
    ['Exportado', new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })],
    ['Anonimato', r.umbral > 1 ? `Las cantidades menores a ${r.umbral} no se muestran («${OCULTO}»). Algunas mayores también, para que una oculta no se despeje restando.` : 'Versión completa: sin cantidades ocultas. No compartir.'],
    ['Cómo leer los cruces', 'Se leen por fila. Muestran cómo se relacionan dos respuestas; no indican que una cause la otra.'],
    ['Opción múltiple', 'En las preguntas de opción múltiple cada persona podía marcar varias: los porcentajes no suman 100%.'],
  ]);
  resumen.getColumn(1).font = { bold: true };
  resumen.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

  const secciones = Object.fromEntries(r.secciones.map((s) => [s.id, s.titulo]));
  const preguntas = hoja(libro, 'Preguntas', [
    { header: 'Sección', key: 'seccion', width: 30 },
    { header: 'Pregunta', key: 'pregunta', width: 60 },
    { header: 'Respuesta', key: 'respuesta', width: 44 },
    { header: 'Personas', key: 'n', width: 14 },
    { header: '% sobre la base', key: 'pct', width: 16, style: { numFmt: '0%' } },
    { header: 'Base (respondieron)', key: 'base', width: 20 },
    { header: 'Tipo', key: 'tipo', width: 14 },
  ]);
  for (const d of r.distribuciones) {
    for (const c of d.celdas) {
      preguntas.addRow({
        seccion: secciones[d.seccion] ?? d.seccion,
        pregunta: d.texto,
        respuesta: c.texto,
        n: cantidad(c),
        pct: porcentaje(c.n, d.base),
        base: d.oculto ? OCULTO : d.base,
        tipo: d.tipo === 'multiple' ? 'varias por persona' : 'una por persona',
      });
    }
  }

  const cruces = hoja(libro, 'Cruces', [
    { header: 'Tema', key: 'seccion', width: 26 },
    { header: 'Cruce', key: 'cruce', width: 56 },
    { header: 'Grupo (fila)', key: 'fila', width: 36 },
    { header: 'Base de la fila', key: 'base', width: 16 },
    { header: 'Respuesta', key: 'columna', width: 30 },
    { header: 'Personas', key: 'n', width: 14 },
    { header: '% de la fila', key: 'pct', width: 14, style: { numFmt: '0%' } },
  ]);
  for (const c of r.cruces) {
    for (const f of c.filas) {
      for (const x of f.celdas) {
        cruces.addRow({
          seccion: c.seccion,
          cruce: `${c.resultado}, según ${c.factor.toLowerCase()}`,
          fila: f.texto,
          base: f.oculto ? OCULTO : f.base,
          columna: x.texto,
          n: cantidad(x),
          pct: porcentaje(x.n, f.base),
        });
      }
    }
  }
}

function hojasCompletas(libro, encuesta, filas, control) {
  const columnas = ['id', 'fecha', ...nombresDeColumnas(encuesta)];
  const respuestas = hoja(libro, 'Respuestas', columnas.map((c) => ({ header: c, key: c, width: Math.max(10, c.length + 2) })));
  for (const f of filas) respuestas.addRow(Object.fromEntries(columnas.map((c) => [c, f[c] ?? null])));

  // Qué significa cada columna y cada código.
  const diccionario = hoja(libro, 'Diccionario', [
    { header: 'Columna', key: 'columna', width: 34 },
    { header: 'Pregunta', key: 'pregunta', width: 60 },
    { header: 'Valores', key: 'valores', width: 80 },
  ]);
  diccionario.addRow({ columna: 'id', pregunta: 'Número de fila (orden de llegada)', valores: '' });
  diccionario.addRow({ columna: 'fecha', pregunta: 'Fecha de envío, sin hora (hora argentina)', valores: 'AAAA-MM-DD' });
  const vacio = 'Vacío = no se le preguntó (otra rama) o no respondió.';
  for (const p of preguntasConRespuesta(encuesta)) {
    if (p.tipo === 'multiple') {
      for (const o of p.opciones) {
        diccionario.addRow({ columna: columnaDeOpcion(p, o), pregunta: `${p.texto} → ${o.texto}`, valores: `1 = la marcó · 0 = no la marcó. ${vacio}` });
      }
    } else if (p.tipo === 'unica') {
      diccionario.addRow({ columna: p.id, pregunta: p.texto, valores: `${p.opciones.map((o) => `${o.valor} = ${o.texto}`).join(' · ')}. ${vacio}` });
    } else if (p.tipo === 'escala') {
      const pasos = [];
      for (let v = p.min; v <= p.max; v++) pasos.push(`${v}${p.etiquetas?.[v] ? ` = ${p.etiquetas[v]}` : ''}`);
      diccionario.addRow({ columna: p.id, pregunta: p.texto, valores: `${pasos.join(' · ')}. ${vacio}` });
      if (p.opcionNoResponde) {
        diccionario.addRow({ columna: columnaNoResponde(p), pregunta: `${p.texto} → «${p.opcionNoResponde.texto}»`, valores: `1 = eligió «${p.opcionNoResponde.texto}» (la columna ${p.id} queda vacía) · 0 = eligió un paso. ${vacio}` });
      }
    } else {
      diccionario.addRow({ columna: p.id, pregunta: p.texto, valores: p.tipo === 'numero' ? `${p.min} a ${p.max}` : `Texto libre (hasta ${p.maxLargo} caracteres)` });
    }
  }
  for (const c of encuesta.columnasCalculadas ?? []) {
    diccionario.addRow({ columna: c.nombre, pregunta: c.descripcion ?? 'Calculada por el servidor', valores: '' });
  }

  if (control) {
    const e = control.embudo;
    const participacion = hoja(libro, 'Participación', [
      { header: 'Concepto', key: 'concepto', width: 60 },
      { header: 'Cantidad', key: 'n', width: 14 },
    ]);
    participacion.addRows([
      { concepto: 'Entraron a la portada', n: e.entraron },
      { concepto: 'Aceptaron participar', n: e.aceptaron },
      { concepto: 'No participaron', n: e.noParticiparon },
      { concepto: 'Pusieron una edad fuera de rango', n: e.edadFueraDeRango },
      { concepto: 'Enviaron la encuesta', n: e.completaron },
      {},
      { concepto: 'Conteos aproximados: ver docs/PLAN-encuesta-ludopatia.md, 8.7' },
      {},
    ]);
    for (const t of e.tramos) participacion.addRow({ concepto: `Se fueron entre «${t.desde}» y «${t.hasta}»`, n: t.seFueron });
    participacion.addRow({});
    for (const d of control.porDia) participacion.addRow({ concepto: `${d.fecha}: entraron / enviaron`, n: `${d.entraron} / ${d.completaron}` });
  }
}

/**
 * @param {object} resultados - lo que devuelve resultados() para ese rol
 * @param {{ encuesta?: object, filas?: object[] }} [completa] - solo para Juli: filas crudas
 * @returns {Promise<Buffer>}
 */
export async function exportarExcel(resultados, completa) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Encuesta-Ludopatia';
  hojasDeResultados(libro, resultados);
  if (completa) hojasCompletas(libro, completa.encuesta, completa.filas, resultados.control);
  return Buffer.from(await libro.xlsx.writeBuffer());
}
