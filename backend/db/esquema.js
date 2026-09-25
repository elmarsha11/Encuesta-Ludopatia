// Genera el SQL de las tablas a partir de las definiciones de las encuestas.
// Así, agregar o cambiar una pregunta en backend/encuestas/ actualiza la tabla
// sin tener que mantener la misma lista de opciones en dos lugares.

import { columnaDeOpcion, preguntasConRespuesta } from '../validacion.js';

const textoSql = (s) => `'${s.replaceAll("'", "''")}'`;

// Columnas de una pregunta, cada una con su tipo y su regla CHECK.
// El CHECK es una segunda red de seguridad: aunque el validador tuviera un error,
// la base rechaza cualquier valor fuera de lo permitido.
function columnasDePregunta(pregunta, obligatoriaSiempre) {
  const notNull = obligatoriaSiempre ? ' NOT NULL' : '';
  const id = pregunta.id;

  switch (pregunta.tipo) {
    case 'numero':
    case 'escala':
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
    ...preguntasConRespuesta(encuesta).flatMap((p) =>
      p.tipo === 'multiple' ? p.opciones.map((o) => columnaDeOpcion(p, o)) : [p.id],
    ),
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

  return [
    `CREATE TABLE IF NOT EXISTS ${t} (\n  ${columnas.join(',\n  ')}\n)`,
    // Las respuestas son de solo agregar: ni la aplicación ni un error pueden
    // modificarlas o borrarlas. Para corregir algo hay que eliminar el trigger a mano,
    // lo que obliga a que sea una decisión consciente.
    `CREATE TRIGGER IF NOT EXISTS ${t}_sin_modificar BEFORE UPDATE ON ${t}\n` +
      `BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden modificar'); END`,
    `CREATE TRIGGER IF NOT EXISTS ${t}_sin_borrar BEFORE DELETE ON ${t}\n` +
      `BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden borrar'); END`,
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
  return `${encabezado}\n${cuerpo}\n`;
}
