// Condiciones de visibilidad de las preguntas, escritas como DATOS y no como funciones.
//
// Ejemplo: { pregunta: 'aposto_12m', es: ['si'] }
//   → la pregunta se muestra solo si la respuesta a `aposto_12m` es 'si'.
//
// Al ser datos, la misma definición viaja al navegador (GET /api/encuestas/:id) y el
// frontend decide las ramas con exactamente las mismas reglas que valida el backend.

export function esVisible(pregunta, respuestas) {
  const condicion = pregunta.visibleSi;
  if (!condicion) return true;
  return condicion.es.includes(respuestas[condicion.pregunta]);
}
