// Reglas del dashboard como funciones puras (probadas en backend/test/logica-dashboard.test.js).
// Reciben el JSON de /api/resultados/:encuesta y devuelven datos listos para dibujar.
// Las reglas vienen de design/dashboard/HANDOFF.md.

/** Porcentaje entero sobre la base: Math.round(100 × n / base). */
export const pct = (n, base) => (n === null || n === undefined || !base ? null : Math.round((100 * n) / base));

export const numero = (n) => new Intl.NumberFormat('es-AR').format(n);

/**
 * Una fila de un cruce se trata como oculta si CUALQUIERA de sus celdas lo está:
 * con dos columnas y la base a la vista, mostrar una sola es mostrar las dos.
 */
export const filaOculta = (fila) => fila.oculto || fila.base === null || fila.celdas.some((c) => c.oculto);

export const cruceCompletoOculto = (cruce) => cruce.filas.every(filaOculta);

/**
 * La barra apilada solo se puede usar si no hay ninguna categoría oculta: en una barra
 * que suma 100%, el hueco de una oculta revelaría su tamaño.
 */
export const apilable = (d) => !d.oculto && d.celdas.every((c) => !c.oculto && c.n !== null);

/** Suma de varias opciones (p. ej. «apostó» = dos opciones). Oculta si alguna lo está. */
export function suma(d, valores) {
  if (!d || d.oculto) return { n: null, oculto: true, base: d?.base ?? null };
  const celdas = d.celdas.filter((c) => valores.includes(c.valor));
  if (celdas.some((c) => c.oculto)) return { n: null, oculto: true, base: d.base };
  return { n: celdas.reduce((s, c) => s + c.n, 0), oculto: false, base: d.base };
}

/** Distribuciones agrupadas por sección de la encuesta, en orden. */
export function porSeccion(datos) {
  return datos.secciones
    .map((s) => ({ ...s, preguntas: datos.distribuciones.filter((d) => d.seccion === s.id) }))
    .filter((s) => s.preguntas.length > 0);
}

/** Cruces agrupados por su tema, en el orden en que aparecen. */
export function crucesPorTema(datos) {
  const temas = [];
  for (const c of datos.cruces) {
    let tema = temas.find((t) => t.titulo === c.seccion);
    if (!tema) temas.push((tema = { titulo: c.seccion, cruces: [] }));
    tema.cruces.push(c);
  }
  return temas;
}

/** El tramo del embudo donde más gente se fue (o null si nadie se fue). */
export function tramoMayor(tramos) {
  return tramos.reduce((mayor, t) => (t.seFueron > 0 && (!mayor || t.seFueron > mayor.seFueron) ? t : mayor), null);
}

/** Texto para lectores de pantalla con todos los datos de una distribución. */
export function resumenAccesible(d) {
  return d.celdas.map((c) => (c.oculto ? `${c.texto}: oculto` : `${c.texto}: ${pct(c.n, d.base)}% (${c.n})`)).join('; ');
}

/** Primera letra en minúscula («Deudas» → «deudas»), para «…, según deudas». */
export const minuscula = (texto) => texto.charAt(0).toLowerCase() + texto.slice(1);
