// Reglas de la encuesta en el navegador, como funciones puras.
// No tocan la pantalla: reciben datos y devuelven datos. Por eso se pueden probar
// con node:test igual que el backend (backend/test/logica-frontend.test.js).
//
// Portadas del prototipo de Claude Design (design/adolescentes/prototipo/Encuesta.dc.html).

/** Una pregunta es visible si no tiene visibleSi, o si la respuesta a visibleSi.pregunta está en visibleSi.es. */
export function visible(pregunta, respuestas) {
  const c = pregunta.visibleSi;
  if (!c) return true;
  return c.es.includes(respuestas[c.pregunta]);
}

/** Si cambió una rama, descarta las respuestas de preguntas que dejaron de ser visibles. */
export function limpiar(def, respuestas) {
  const limpio = {};
  for (const p of def.preguntas) {
    if (respuestas[p.id] !== undefined && visible(p, limpio)) limpio[p.id] = respuestas[p.id];
  }
  return limpio;
}

export function tieneRespuesta(pregunta, respuestas) {
  const v = respuestas[pregunta.id];
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

export function esObligatoria(def, pregunta) {
  return pregunta.obligatoria ?? def.respuestasObligatorias;
}

/** Cuerpo del POST: solo preguntas visibles con respuesta, con el tipo de dato correcto. */
export function cuerpo(def, respuestas) {
  const c = {};
  for (const p of def.preguntas) {
    if (p.tipo === 'info' || !visible(p, respuestas) || !tieneRespuesta(p, respuestas)) continue;
    const v = respuestas[p.id];
    if (p.tipo === 'numero' || p.tipo === 'escala') c[p.id] = Number.parseInt(v, 10);
    else if (p.tipo === 'texto') c[p.id] = String(v).trim();
    else c[p.id] = v;
  }
  return c;
}

/** Pasos del camino actual: un título de sección antes de la primera pregunta visible de cada sección. */
export function pasos(def, respuestas) {
  const lista = [];
  let anterior = null;
  for (const p of def.preguntas) {
    if (!visible(p, respuestas)) continue;
    if (p.seccion !== anterior) {
      lista.push({ clase: 'seccion', seccion: def.secciones.find((s) => s.id === p.seccion) });
      anterior = p.seccion;
    }
    lista.push({ clase: 'pregunta', pregunta: p });
  }
  return lista;
}

// Preguntas ya pasadas antes del paso `indice`.
function pasadasHasta(lista, indice) {
  const pasadas = new Set();
  for (let i = 0; i < indice && i < lista.length; i++) {
    if (lista[i].clase === 'pregunta') pasadas.add(lista[i].pregunta.id);
  }
  return pasadas;
}

// Una pregunta "cuenta" para el progreso si es visible, o si su rama todavía no se decidió
// (la pregunta de la que depende no quedó atrás). Así la barra nunca retrocede.
const cuenta = (p, respuestas, pasadas) =>
  visible(p, respuestas) || (p.visibleSi && !pasadas.has(p.visibleSi.pregunta));

/** Progreso sobre el camino actual: { hechas, total } (solo preguntas, sin títulos de sección). */
export function progreso(def, respuestas, indice, lista) {
  const pasadas = pasadasHasta(lista, indice);
  const hechas = pasadas.size;
  const total = def.preguntas.filter((p) => p.tipo !== 'info' && cuenta(p, respuestas, pasadas)).length;
  return { hechas, total };
}

/**
 * Avance del motivo de píxeles, de 0 (portada) a 1 (final). Cuenta TODAS las pantallas
 * (portada, títulos de sección y preguntas), así cambia desde la primera.
 */
export function avanceMotivo(def, respuestas, indice, lista) {
  const pasadas = pasadasHasta(lista, indice);
  let pantallas = 0;
  let anterior = null;
  for (const p of def.preguntas) {
    if (!cuenta(p, respuestas, pasadas)) continue;
    if (p.seccion !== anterior) {
      pantallas++;
      anterior = p.seccion;
    }
    pantallas++;
  }
  const totalPantallas = pantallas + 2; // + portada + final
  return Math.min(1, (1 + indice) / (totalPantallas - 1));
}

/** La curva 1 - (1 - a)²: los primeros pasos se notan más y al final se aquieta. */
export const calma = (avance) => 1 - (1 - Math.max(0, Math.min(1, avance))) ** 2;

/**
 * Opción múltiple: devuelve la nueva lista de valores al tocar `opcion`.
 * Una exclusiva desmarca las demás, y marcar otra desmarca la exclusiva.
 * El resultado respeta el orden de las opciones.
 */
export function alternar(pregunta, actual, opcion) {
  let nueva;
  if (actual.includes(opcion.valor)) nueva = actual.filter((v) => v !== opcion.valor);
  else if (opcion.exclusiva) nueva = [opcion.valor];
  else {
    const exclusivas = new Set(pregunta.opciones.filter((o) => o.exclusiva).map((o) => o.valor));
    nueva = [...actual.filter((v) => !exclusivas.has(v)), opcion.valor];
  }
  return pregunta.opciones.map((o) => o.valor).filter((v) => nueva.includes(v));
}

// Posiciones del motivo de píxeles "en desorden" (portada). Valores del prototipo.
const PX_X = [8, 30, 46, 71, 90, 118, 133, 160, 181, 204, 222, 247, 263, 289, 301, 318, 250, 150];
const PX_Y = [30, 12, 40, 22, 6, 34, 18, 44, 10, 28, 4, 38, 20, 8, 42, 24, 48, 2];
const PX_OPACIDAD = [0.35, 0.8, 0.5, 0.9, 0.3, 0.65, 0.45, 0.85, 0.3, 0.7, 0.5, 0.9, 0.35, 0.6, 0.8, 0.4, 0.55, 0.7];
const PX_TONO = [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0];
const TONOS = ['var(--color-lila)', 'var(--color-borde)'];
export const CANTIDAD_PIXELES = PX_X.length;

/**
 * Motivo de píxeles: ruido al principio (calma 0), una fila ordenada al final (calma 1).
 * @param {number} valorCalma - 0 a 1
 * @param {boolean} aparecido - false en la primera carga: arrancan invisibles y un poco más abajo
 * @param {number} ancho - ancho real del motivo en px (la fila final va de margen a margen)
 */
export function pixeles(valorCalma, aparecido, ancho = 342) {
  const c = Math.max(0, Math.min(1, valorCalma));
  return PX_X.map((x, i) => {
    const sx = Math.round(x / 6) * 6;
    const sy = Math.round(PX_Y[i] / 6) * 6;
    const y = Math.round(sy + (24 - sy) * c);
    const tx = Math.round((i * (ancho - 6)) / (PX_X.length - 1));
    return {
      x: Math.round(sx + (tx - sx) * c),
      y: aparecido ? y : y + 10,
      opacidad: aparecido ? (PX_OPACIDAD[i] + (0.55 - PX_OPACIDAD[i]) * c).toFixed(2) : '0',
      color: c > 0.85 ? TONOS[0] : TONOS[PX_TONO[i]],
      retraso: i * 30,
      ola: -i * 180, // desfase: cada píxel sube un poco después que el anterior = onda
    };
  });
}

/** "el lunes 19 de octubre a las 8:00", en hora argentina. */
export function formatearApertura(iso) {
  const fecha = new Date(iso);
  const opciones = { timeZone: 'America/Argentina/Buenos_Aires' };
  const dia = new Intl.DateTimeFormat('es-AR', { ...opciones, weekday: 'long', day: 'numeric', month: 'long' }).format(fecha);
  const hora = new Intl.DateTimeFormat('es-AR', { ...opciones, hour: 'numeric', minute: '2-digit', hour12: false }).format(fecha);
  return `el ${dia.replace(',', '')} a las ${hora}`;
}
