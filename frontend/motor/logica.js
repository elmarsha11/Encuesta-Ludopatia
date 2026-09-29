// Reglas de la encuesta en el navegador, como funciones puras.
// No tocan la pantalla: reciben datos y devuelven datos. Por eso se pueden probar
// con node:test igual que el backend (backend/test/logica-frontend.test.js).
//
// Portadas de los prototipos de Claude Design (design/adolescentes/ y design/adultos/).

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
  if (pregunta.tipo === 'info') return false; // se lee, no se responde
  return pregunta.obligatoria ?? def.respuestasObligatorias;
}

/** Cuerpo del POST: solo preguntas visibles con respuesta, con el tipo de dato correcto. */
export function cuerpo(def, respuestas) {
  const c = {};
  for (const p of def.preguntas) {
    if (p.tipo === 'info' || !visible(p, respuestas) || !tieneRespuesta(p, respuestas)) continue;
    const v = respuestas[p.id];
    if (p.tipo === 'escala' && v === p.opcionNoResponde?.valor) c[p.id] = v; // «Prefiero no responder» viaja como texto
    else if (p.tipo === 'numero' || p.tipo === 'escala') c[p.id] = Number.parseInt(v, 10);
    else if (p.tipo === 'texto') c[p.id] = String(v).trim();
    else c[p.id] = v;
  }
  return c;
}

/**
 * Pasos del camino actual: un título de sección antes de la primera pregunta visible de cada
 * sección, salvo que la encuesta pida ir de pregunta en pregunta (portadasDeSeccion: false).
 */
export function pasos(def, respuestas) {
  const lista = [];
  let anterior = null;
  for (const p of def.preguntas) {
    if (!visible(p, respuestas)) continue;
    if (def.portadasDeSeccion !== false && p.seccion !== anterior) {
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
  // Las pantallas info no se responden: no suman ni en lo hecho ni en el total.
  const hechas = def.preguntas.filter((p) => p.tipo !== 'info' && pasadas.has(p.id)).length;
  const total = def.preguntas.filter((p) => p.tipo !== 'info' && cuenta(p, respuestas, pasadas)).length;
  return { hechas, total };
}

/**
 * Ubicación de la pantalla de sección `indice`: { numero, total } («Parte 2 de 4»).
 * El total usa la misma regla que la barra de progreso (cuenta): una sección cuya rama
 * todavía no se decidió ya se cuenta, así el total nunca crece a mitad de camino.
 */
export function ubicacionSeccion(def, respuestas, indice, lista) {
  const pasadas = pasadasHasta(lista, indice);
  const secciones = [];
  for (const p of def.preguntas) {
    if (cuenta(p, respuestas, pasadas) && secciones.at(-1) !== p.seccion) secciones.push(p.seccion);
  }
  const actual = lista[indice]?.seccion?.id;
  return { numero: secciones.indexOf(actual) + 1, total: secciones.length };
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
    if (def.portadasDeSeccion !== false && p.seccion !== anterior) {
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

/**
 * Qué componente dibuja una escala, según su forma (no según la encuesta):
 * - presentacion 'slider'          → 'tramos' (escalones que crecen)
 * - etiqueta en CADA punto (PGSI)  → 'frecuencia' (renglones anclados abajo)
 * - etiquetas solo en los extremos → 'puntos' (la de adolescentes)
 */
export function componenteEscala(pregunta) {
  if (pregunta.presentacion === 'slider') return 'tramos';
  for (let v = pregunta.min; v <= pregunta.max; v++) if (!pregunta.etiquetas?.[v]) return 'puntos';
  return 'frecuencia';
}

/** «Pregunta n de N» dentro del bloque de escalas de frecuencia de la misma sección, en el camino actual. */
export function contextoFrecuencia(pregunta, lista) {
  const bloque = lista.filter(
    (s) =>
      s.clase === 'pregunta' &&
      s.pregunta.seccion === pregunta.seccion &&
      s.pregunta.tipo === 'escala' &&
      componenteEscala(s.pregunta) === 'frecuencia',
  );
  return { n: bloque.findIndex((s) => s.pregunta.id === pregunta.id) + 1, total: bloque.length };
}

/** $383.800: punto de miles, sin decimales. */
export const formatearPesos = (n) => `$${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/**
 * Equivalente en pesos de un paso: rangosSmvm × smvmReferencia.
 * Devuelve '' si la pregunta no trae rangos. Los textos vienen de la interfaz ({monto}, {desde}, {hasta}).
 */
export function textoPesos(pregunta, valor, smvm, textos) {
  const rango = pregunta.rangosSmvm?.[valor];
  if (!rango || !smvm) return '';
  const [desde, hasta] = rango;
  let texto;
  if (!desde) texto = textos.hasta.replace('{monto}', formatearPesos(hasta * smvm));
  else if (hasta === null) texto = textos.masDe.replace('{monto}', formatearPesos(desde * smvm));
  else texto = textos.entre.replace('{desde}', formatearPesos(desde * smvm)).replace('{hasta}', formatearPesos(hasta * smvm));
  return textos.porMes ? `${texto} ${textos.porMes}` : texto;
}

/**
 * Si las opciones van en dos columnas (para que las listas largas entren en el celular).
 * Solo cuando el orden NO significa nada: opción múltiple con 6 o más opciones («marcá las
 * que correspondan»), o respuesta única con opciones agrupadas (la carrera). Una respuesta
 * única sin grupos puede ser una escala ordenada (Nunca → Casi todos los días): en dos
 * columnas se rompería la lectura de menos a más, así que queda en una.
 */
export function enColumnas(pregunta) {
  if (pregunta.tipo === 'multiple') return pregunta.opciones.length >= 6;
  if (pregunta.tipo === 'unica') return pregunta.opciones.some((o) => o.grupo);
  return false;
}

/**
 * Opciones en grupos consecutivos por su `grupo`. Sin `grupo`, un solo grupo sin rótulo.
 * Un grupo de UNA opción que se llama igual que el grupo («Educación Inicial») no muestra
 * rótulo: sería repetir la misma palabra.
 */
export function gruposDeOpciones(opciones) {
  const grupos = [];
  for (const o of opciones) {
    const titulo = o.grupo ?? '';
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.titulo === titulo) ultimo.opciones.push(o);
    else grupos.push({ titulo, opciones: [o] });
  }
  return grupos.map((g) => ({
    ...g,
    mostrarTitulo: g.titulo !== '' && !(g.opciones.length === 1 && g.opciones[0].texto === g.titulo),
  }));
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
 * @param {number} alto - alto real del motivo en px (en pantallas bajas la franja se achica)
 */
export function pixeles(valorCalma, aparecido, ancho = 342, alto = 56) {
  // Las alturas del prototipo van de 0 a 48 en una franja de 56px: se estiran al alto real.
  const escalaY = Math.max(0, alto - 8) / 48;
  const c = Math.max(0, Math.min(1, valorCalma));
  return PX_X.map((x, i) => {
    // Las posiciones del prototipo son para 342px: se estiran al ancho real, así el
    // desorden del principio también va de margen a margen.
    const sx = Math.round((x * ancho) / 342 / 6) * 6;
    const sy = Math.round((PX_Y[i] * escalaY) / 6) * 6;
    const fila = Math.round(24 * escalaY); // la fila ordenada del final, a media altura
    const y = Math.round(sy + (fila - sy) * c);
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
