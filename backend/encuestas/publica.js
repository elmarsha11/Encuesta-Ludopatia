// Versión pública de una encuesta: lo que necesita el navegador para dibujarla.
// Se arma campo por campo (en vez de mandar el objeto entero) para no exponer
// por accidente detalles internos como el nombre de la tabla o las funciones de cálculo.

export function definicionPublica(encuesta) {
  return {
    id: encuesta.id,
    titulo: encuesta.titulo,
    respuestasObligatorias: encuesta.respuestasObligatorias,
    smvmReferencia: encuesta.smvmReferencia,
    pantallas: encuesta.pantallas,
    secciones: encuesta.secciones,
    preguntas: encuesta.preguntas,
  };
}
