// Regla de anonimato de los resultados: ninguna cantidad chica se muestra.
//
// Con pocas personas en una celda («Trabajo Social · riesgo alto: 1») cualquiera que
// conozca al grupo puede adivinar de quién se trata. Por eso toda cantidad entre 1 y
// UMBRAL - 1 se oculta. El 0 sí se muestra: no apunta a nadie.

export const UMBRAL = 5;

const esChica = (n, umbral) => n > 0 && n < umbral;

/**
 * Oculta las celdas chicas de una distribución.
 *
 * Si las celdas son una PARTICIÓN de la base (cada persona está en exactamente una,
 * como en una pregunta de opción única) y se muestra la base, esconder una sola
 * celda no alcanza: se despeja restando (base 30, se ven 12 y 15 → la oculta es 3).
 * En ese caso se oculta también la celda visible más chica («supresión secundaria»).
 * En una opción múltiple las celdas no suman la base, así que la resta no sirve.
 *
 * @param {{ valor: string, n: number }[]} celdas
 * @param {{ umbral?: number, particion: boolean }} opciones - umbral 1 = no ocultar nada
 * @returns {{ valor: string, n: number | null, oculto: boolean }[]}
 */
export function ocultarCeldas(celdas, { umbral = UMBRAL, particion }) {
  const oculta = celdas.map((c) => esChica(c.n, umbral));

  if (particion && oculta.filter(Boolean).length === 1) {
    let menor = -1;
    celdas.forEach((c, i) => {
      if (!oculta[i] && c.n > 0 && (menor === -1 || c.n < celdas[menor].n)) menor = i;
    });
    if (menor !== -1) oculta[menor] = true;
  }

  return celdas.map((c, i) => ({ ...c, n: oculta[i] ? null : c.n, oculto: oculta[i] }));
}

/**
 * Una distribución completa (base + celdas). Si la base misma es chica, se oculta todo:
 * «3 personas de Trabajo Social respondieron» ya es demasiado específico, y con una
 * base tan chica los porcentajes no significan nada.
 */
export function ocultarDistribucion(base, celdas, { umbral = UMBRAL, particion }) {
  if (esChica(base, umbral)) {
    return { base: null, oculto: true, celdas: celdas.map((c) => ({ ...c, n: null, oculto: true })) };
  }
  return { base, oculto: false, celdas: ocultarCeldas(celdas, { umbral, particion }) };
}

/**
 * Tabla de un cruce: filas (con su base) × columnas.
 *
 * Además de la fila, hay que proteger cada COLUMNA: el total de una columna se conoce
 * por la distribución simple de esa pregunta («apostó: 30»), así que una columna con
 * una sola celda oculta también se despeja restando. Se repite fila por fila y columna
 * por columna hasta que ninguna línea quede con una única celda oculta.
 *
 * @param {{ base: number, celdas: { n: number }[] }[]} filas
 * @returns {{ base: number | null, oculto: boolean, celdas: { n: number | null, oculto: boolean }[] }[]}
 */
export function ocultarTabla(filas, { umbral = UMBRAL }) {
  const filaOculta = filas.map((f) => esChica(f.base, umbral));
  const oculta = filas.map((f, r) => f.celdas.map((c) => filaOculta[r] || esChica(c.n, umbral)));
  const columnas = filas[0]?.celdas.length ?? 0;

  // Entre las posiciones visibles, oculta la de menor cantidad (prefiriendo las no vacías).
  const ocultarMenor = (posiciones) => {
    const visibles = posiciones.filter(([r, c]) => !oculta[r][c]);
    if (visibles.length === 0) return false;
    const n = ([r, c]) => filas[r].celdas[c].n;
    const candidatas = visibles.some((p) => n(p) > 0) ? visibles.filter((p) => n(p) > 0) : visibles;
    const [r, c] = candidatas.reduce((menor, p) => (n(p) < n(menor) ? p : menor));
    oculta[r][c] = true;
    return true;
  };
  const unaSola = (posiciones) => posiciones.filter(([r, c]) => oculta[r][c]).length === 1;

  let cambio = umbral > 1;
  while (cambio) {
    cambio = false;
    filas.forEach((f, r) => {
      if (filaOculta[r]) return; // su base no se muestra: no hay total para restar
      const linea = f.celdas.map((_, c) => [r, c]);
      if (unaSola(linea) && ocultarMenor(linea)) cambio = true;
    });
    for (let c = 0; c < columnas; c++) {
      const linea = filas.map((_, r) => [r, c]);
      if (unaSola(linea) && ocultarMenor(linea)) cambio = true;
    }
  }

  return filas.map((f, r) => ({
    ...f,
    base: filaOculta[r] ? null : f.base,
    oculto: filaOculta[r],
    celdas: f.celdas.map((c, k) => ({ ...c, n: oculta[r][k] ? null : c.n, oculto: oculta[r][k] })),
  }));
}
