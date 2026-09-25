// Validación de una respuesta completa contra la definición de su encuesta.
//
// El frontend también valida, pero esa validación se puede saltear (cualquiera puede
// mandar un POST a mano). Esta es la que protege los datos: si algo no cierra,
// la respuesta se rechaza entera y no se guarda nada.

const esVacio = (valor) =>
  valor === undefined ||
  valor === null ||
  (typeof valor === 'string' && valor.trim() === '') ||
  (Array.isArray(valor) && valor.length === 0);

// Nombre de la columna que guarda una opción de una pregunta de respuesta múltiple.
export const columnaDeOpcion = (pregunta, opcion) => `${pregunta.id}_${opcion.valor}`;

// Revisa un valor ya presente según el tipo de pregunta.
// Devuelve un mensaje de error, o null si el valor es válido.
function errorDeValor(pregunta, valor) {
  switch (pregunta.tipo) {
    case 'numero':
    case 'escala':
      if (!Number.isInteger(valor) || valor < pregunta.min || valor > pregunta.max) {
        return `debe ser un número entero entre ${pregunta.min} y ${pregunta.max}`;
      }
      return null;

    case 'unica':
      if (!pregunta.opciones.some((o) => o.valor === valor)) return 'opción inválida';
      return null;

    case 'multiple': {
      if (!Array.isArray(valor)) return 'debe ser una lista de opciones';
      if (new Set(valor).size !== valor.length) return 'tiene opciones repetidas';
      const elegidas = valor.map((v) => pregunta.opciones.find((o) => o.valor === v));
      if (elegidas.includes(undefined)) return 'tiene una opción inválida';
      // Opciones como "Prefiero no responder" o "Ninguno" no se combinan con otras.
      if (valor.length > 1 && elegidas.some((o) => o.exclusiva)) {
        return 'combina una opción exclusiva con otras';
      }
      return null;
    }

    case 'texto':
      if (typeof valor !== 'string') return 'debe ser texto';
      if (valor.trim().length > pregunta.maxLargo) {
        return `supera los ${pregunta.maxLargo} caracteres`;
      }
      return null;

    default:
      throw new Error(`Tipo de pregunta desconocido: ${pregunta.tipo}`);
  }
}

// Convierte una pregunta (y su valor, o null) en columnas de la tabla.
function aColumnas(pregunta, valor) {
  if (pregunta.tipo === 'multiple') {
    // null = no se le preguntó o no respondió; 0 = se le preguntó y no marcó esa opción.
    return Object.fromEntries(
      pregunta.opciones.map((o) => [
        columnaDeOpcion(pregunta, o),
        valor === null ? null : Number(valor.includes(o.valor)),
      ]),
    );
  }
  if (pregunta.tipo === 'texto' && valor !== null) return { [pregunta.id]: valor.trim() };
  return { [pregunta.id]: valor };
}

/**
 * Valida el cuerpo de un POST contra la encuesta.
 * @returns {{ ok: true, fila: object } | { ok: false, errores: string[] }}
 *   `fila` tiene exactamente las columnas de la tabla, listas para insertar.
 */
export function validarRespuesta(encuesta, cuerpo) {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    return { ok: false, errores: ['El cuerpo debe ser un objeto JSON'] };
  }

  const errores = [];
  const idsConocidos = new Set(encuesta.preguntas.map((p) => p.id));
  for (const clave of Object.keys(cuerpo)) {
    if (!idsConocidos.has(clave)) errores.push(`${clave}: campo desconocido`);
  }

  // Respuestas ya validadas, en orden. Las condiciones de visibilidad se evalúan
  // sobre estas (y no sobre el cuerpo crudo) para no confiar en datos sin validar.
  const respuestas = {};
  let fila = {};

  for (const pregunta of encuesta.preguntas) {
    const valor = cuerpo[pregunta.id];
    const visible = pregunta.visibleSi ? pregunta.visibleSi(respuestas) : true;

    if (!visible) {
      // Si la pregunta no corresponde a esta rama, no debería venir respondida.
      if (!esVacio(valor)) errores.push(`${pregunta.id}: no corresponde a las respuestas anteriores`);
      respuestas[pregunta.id] = null;
    } else if (esVacio(valor)) {
      const obligatoria = pregunta.obligatoria ?? encuesta.respuestasObligatorias;
      if (obligatoria) errores.push(`${pregunta.id}: es obligatoria`);
      respuestas[pregunta.id] = null;
    } else {
      const error = errorDeValor(pregunta, valor);
      if (error) errores.push(`${pregunta.id}: ${error}`);
      respuestas[pregunta.id] = error ? null : valor;
    }

    fila = { ...fila, ...aColumnas(pregunta, respuestas[pregunta.id]) };
  }

  if (errores.length > 0) return { ok: false, errores };

  if (encuesta.calcular) fila = { ...fila, ...encuesta.calcular(respuestas) };
  return { ok: true, fila };
}
