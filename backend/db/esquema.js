// Genera el SQL de las tablas a partir de las definiciones de las encuestas.
// Así, agregar o cambiar una pregunta en backend/encuestas/ actualiza la tabla
// sin tener que mantener la misma lista de opciones en dos lugares.

import { columnaDeOpcion, columnaNoResponde, preguntasConRespuesta } from '../validacion.js';
import { EVENTOS } from '../eventos.js';

const textoSql = (s) => `'${s.replaceAll("'", "''")}'`;

// Columnas de una pregunta, cada una con su tipo y su regla CHECK.
// El CHECK es una segunda red de seguridad: aunque el validador tuviera un error,
// la base rechaza cualquier valor fuera de lo permitido.
function columnasDePregunta(pregunta, obligatoriaSiempre) {
  const notNull = obligatoriaSiempre ? ' NOT NULL' : '';
  const id = pregunta.id;

  switch (pregunta.tipo) {
    case 'escala':
      if (pregunta.opcionNoResponde) {
        // El número puede faltar solo si la marca dice «prefirió no responder», y al revés:
        // la base no acepta las dos cosas juntas ni la marca sin número.
        const marca = columnaNoResponde(pregunta);
        return [
          `${id} INTEGER CHECK (${id} BETWEEN ${pregunta.min} AND ${pregunta.max})`,
          `${marca} INTEGER${notNull} CHECK (${marca} IN (0, 1))`,
          // IS y no =: en SQL, NULL = 0 da NULL, y un CHECK que da NULL se acepta.
          `CHECK ((${marca} IS NULL AND ${id} IS NULL) OR (${marca} IS 1 AND ${id} IS NULL) OR (${marca} IS 0 AND ${id} IS NOT NULL))`,
        ];
      }
    // falls through
    case 'numero':
      return [
        `${id} INTEGER${notNull} CHECK (${id} BETWEEN ${pregunta.min} AND ${pregunta.max})`,
      ];
    case 'unica': {
      const valores = pregunta.opciones.map((o) => textoSql(o.valor)).join(', ');
      return [`${id} TEXT${notNull} CHECK (${id} IN (${valores}))`];
    }
    case 'multiple':
      return pregunta.opciones.map((o) => {
        const col = columnaDeOpcion(pregunta, o);
        return `${col} INTEGER${notNull} CHECK (${col} IN (0, 1))`;
      });
    case 'texto':
      return [`${id} TEXT${notNull} CHECK (length(${id}) <= ${pregunta.maxLargo})`];
    default:
      throw new Error(`Tipo de pregunta desconocido: ${pregunta.tipo}`);
  }
}

/** Lista ordenada de nombres de columna de la tabla de una encuesta (sin `id` ni `fecha`). */
export function nombresDeColumnas(encuesta) {
  return [
    ...preguntasConRespuesta(encuesta).flatMap((p) => {
      if (p.tipo === 'multiple') return p.opciones.map((o) => columnaDeOpcion(p, o));
      if (p.tipo === 'escala' && p.opcionNoResponde) return [p.id, columnaNoResponde(p)];
      return [p.id];
    }),
    ...(encuesta.columnasCalculadas ?? []).map((c) => c.nombre),
  ];
}

/** Sentencias SQL que crean la tabla de una encuesta y sus protecciones. */
export function sentenciasDeEncuesta(encuesta) {
  const t = encuesta.tabla;
  const columnas = [
    'id INTEGER PRIMARY KEY AUTOINCREMENT',
    // Solo la fecha, sin hora, para reducir el riesgo de identificar a alguien.
    // Hora argentina (UTC-3, sin horario de verano).
    "fecha TEXT NOT NULL DEFAULT (date('now', '-3 hours'))",
    ...preguntasConRespuesta(encuesta).flatMap((p) => {
      // NOT NULL solo si la pregunta se muestra a todos y es obligatoria.
      const obligatoria = p.obligatoria ?? encuesta.respuestasObligatorias;
      return columnasDePregunta(p, obligatoria && !p.visibleSi);
    }),
    ...(encuesta.columnasCalculadas ?? []).map((c) => `${c.nombre} ${c.sql}`),
  ];
  // SQLite pide las restricciones que miran varias columnas DESPUÉS de todas las columnas.
  const esRestriccion = (linea) => linea.startsWith('CHECK (');
  const definicion = [...columnas.filter((l) => !esRestriccion(l)), ...columnas.filter(esRestriccion)];

  return [
    `CREATE TABLE IF NOT EXISTS ${t} (\n  ${definicion.join(',\n  ')}\n)`,
    // Las respuestas son de solo agregar: ni la aplicación ni un error pueden
    // modificarlas o borrarlas. Para corregir algo hay que eliminar el trigger a mano,
    // lo que obliga a que sea una decisión consciente.
    `CREATE TRIGGER IF NOT EXISTS ${t}_sin_modificar BEFORE UPDATE ON ${t}\n` +
      `BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden modificar'); END`,
    `CREATE TRIGGER IF NOT EXISTS ${t}_sin_borrar BEFORE DELETE ON ${t}\n` +
      `BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden borrar'); END`,
  ];
}

/**
 * Tabla de eventos del recorrido (para contar quién no participó y dónde se abandona).
 * Cada evento es una fila suelta: sin identificador de sesión, sin hora y sin IP.
 * No hay ningún dato que una los eventos de una persona entre sí ni con su respuesta:
 * están hechos para contarse. (Como en toda tabla, el número de fila sigue el orden de
 * llegada, pero no dice nada que la fila de respuestas no diga ya.) Es de solo agregar.
 */
export function sentenciasDeEventos(encuestas) {
  const ids = Object.keys(encuestas).map(textoSql).join(', ');
  const eventos = EVENTOS.map(textoSql).join(', ');
  return [
    'CREATE TABLE IF NOT EXISTS eventos (\n' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      "  fecha TEXT NOT NULL DEFAULT (date('now', '-3 hours')),\n" +
      `  encuesta TEXT NOT NULL CHECK (encuesta IN (${ids})),\n` +
      `  evento TEXT NOT NULL CHECK (evento IN (${eventos})),\n` +
      '  pregunta TEXT,\n' +
      // Solo «vio» lleva pregunta, y siempre la lleva.
      "  CHECK ((evento = 'vio') = (pregunta IS NOT NULL))\n" +
      ')',
    "CREATE TRIGGER IF NOT EXISTS eventos_sin_modificar BEFORE UPDATE ON eventos\n" +
      "BEGIN SELECT RAISE(ABORT, 'Los eventos no se pueden modificar'); END",
    "CREATE TRIGGER IF NOT EXISTS eventos_sin_borrar BEFORE DELETE ON eventos\n" +
      "BEGIN SELECT RAISE(ABORT, 'Los eventos no se pueden borrar'); END",
  ];
}

/** Script SQL completo (todas las encuestas), para leerlo o ejecutarlo a mano. */
export function scriptCompleto(encuestas) {
  const encabezado =
    '-- ARCHIVO GENERADO por `npm run schema` a partir de backend/encuestas/.\n' +
    '-- No editar a mano: cambiar la definición de la encuesta y volver a generar.\n';
  const cuerpo = Object.values(encuestas)
    .map((e) => `-- Encuesta: ${e.id}\n` + sentenciasDeEncuesta(e).map((s) => `${s};`).join('\n\n'))
    .join('\n\n');
  const eventos = '-- Eventos del recorrido (conteos anónimos)\n' + sentenciasDeEventos(encuestas).map((s) => `${s};`).join('\n\n');
  return `${encabezado}\n${cuerpo}\n\n${eventos}\n`;
}
