// Cálculo de resultados a partir de las filas de una encuesta.
// Funciones puras: reciben filas (objetos columna → valor) y devuelven conteos ya
// protegidos por la regla de anonimato. Nunca devuelven una fila individual.

import { columnaDeOpcion, columnaNoResponde } from '../validacion.js';
import { ocultarDistribucion, ocultarTabla } from './anonimato.js';

const presente = (v) => v !== null && v !== undefined;
const contar = (filas, condicion) => filas.reduce((n, f) => n + (condicion(f) ? 1 : 0), 0);

/** ¿El valor cae en este nivel? (lista de valores o rango numérico) */
export const enNivel = (nivel, v) =>
  presente(v) && (nivel.rango ? v >= nivel.rango[0] && v <= nivel.rango[1] : nivel.incluye.includes(v));

/**
 * Categorías y base de una pregunta. La base es quien la RESPONDIÓ (en una pregunta
 * de rama, solo quienes la vieron): así los porcentajes no se diluyen con gente a
 * la que nunca se le preguntó.
 */
function conteoDePregunta(p, filas, config) {
  switch (p.tipo) {
    case 'unica': {
      const respondieron = filas.filter((f) => presente(f[p.id]));
      const celdas = p.opciones.map((o) => ({ valor: o.valor, texto: o.texto, n: contar(respondieron, (f) => f[p.id] === o.valor) }));
      return { base: respondieron.length, celdas, particion: true };
    }
    case 'multiple': {
      // Todas las columnas de la pregunta son NULL si no se le preguntó.
      const primera = columnaDeOpcion(p, p.opciones[0]);
      const respondieron = filas.filter((f) => presente(f[primera]));
      const celdas = p.opciones.map((o) => ({ valor: o.valor, texto: o.texto, n: contar(respondieron, (f) => f[columnaDeOpcion(p, o)] === 1) }));
      return { base: respondieron.length, celdas, particion: false };
    }
    case 'escala': {
      const noResponde = p.opcionNoResponde ? columnaNoResponde(p) : null;
      const respondieron = filas.filter((f) => presente(f[p.id]) || (noResponde && f[noResponde] === 1));
      const celdas = [];
      for (let v = p.min; v <= p.max; v++) {
        celdas.push({ valor: String(v), texto: p.etiquetas?.[v] ?? String(v), n: contar(respondieron, (f) => f[p.id] === v) });
      }
      if (noResponde) {
        celdas.push({ valor: p.opcionNoResponde.valor, texto: p.opcionNoResponde.texto, n: contar(respondieron, (f) => f[noResponde] === 1) });
      }
      return { base: respondieron.length, celdas, particion: true };
    }
    case 'numero': {
      const respondieron = filas.filter((f) => presente(f[p.id]));
      const grupos = config.gruposEdad ?? [];
      const celdas = grupos.length
        ? grupos.map((g) => ({ valor: g.valor, texto: g.texto, n: contar(respondieron, (f) => enNivel(g, f[p.id])) }))
        : Array.from({ length: p.max - p.min + 1 }, (_, i) => {
            const v = p.min + i;
            return { valor: String(v), texto: String(v), n: contar(respondieron, (f) => f[p.id] === v) };
          });
      return { base: respondieron.length, celdas, particion: true };
    }
    default:
      return null; // texto libre e info: no van al dashboard (el comentario solo en el Excel de Juli)
  }
}

/** Distribución de cada pregunta, en el orden de la encuesta, más las columnas calculadas. */
export function distribuciones(encuesta, filas, config, { umbral }) {
  const resultado = [];
  for (const p of encuesta.preguntas) {
    const conteo = conteoDePregunta(p, filas, config);
    if (!conteo) continue;
    const protegida = ocultarDistribucion(conteo.base, conteo.celdas, { umbral, particion: conteo.particion });
    resultado.push({ id: p.id, seccion: p.seccion, tipo: p.tipo, texto: p.texto, ...protegida });
  }
  for (const c of config.calculadas ?? []) {
    const respondieron = filas.filter((f) => presente(f[c.id]));
    const celdas = c.categorias.map(([valor, texto]) => ({ valor, texto, n: contar(respondieron, (f) => f[c.id] === valor) }));
    const protegida = ocultarDistribucion(respondieron.length, celdas, { umbral, particion: true });
    resultado.push({ id: c.id, seccion: c.seccion, tipo: 'calculada', texto: c.texto, ...protegida });
  }
  return resultado;
}

/**
 * Un cruce: una fila por nivel del factor, con la distribución del resultado dentro de
 * esa fila (su base se muestra). La tabla entera se protege por filas y por columnas
 * (ver ocultarTabla).
 */
export function cruce(definicion, filas, variables, { umbral }) {
  const factor = variables[definicion.factor];
  const resultado = variables[definicion.resultado];
  const nivelDe = (variable, f) => variable.niveles.find((n) => enNivel(n, f[variable.columna]));

  const tabla = factor.niveles.map((nf) => {
    const grupo = filas.filter((f) => nivelDe(factor, f) === nf && nivelDe(resultado, f));
    const celdas = resultado.niveles.map((nr) => ({ valor: nr.valor, texto: nr.texto, n: contar(grupo, (f) => nivelDe(resultado, f) === nr) }));
    return { valor: nf.valor, texto: nf.texto, base: grupo.length, celdas };
  });
  const filasCruce = ocultarTabla(tabla, { umbral });

  return {
    id: definicion.id,
    seccion: definicion.seccion,
    factor: factor.texto,
    resultado: resultado.texto,
    columnas: resultado.niveles.map((n) => ({ valor: n.valor, texto: n.texto })),
    filas: filasCruce,
  };
}
