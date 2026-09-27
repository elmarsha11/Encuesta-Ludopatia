// Acceso a los resultados: contraseñas por rol y sesiones.
//
// Cada rol tiene su contraseña en .env. Si una está vacía, ese acceso NO EXISTE: así el
// grupo y los docentes no pueden entrar hasta que Juli cargue su contraseña al cerrar la
// encuesta (docs/PLAN-encuesta-ludopatia.md, 8.6).
//
// Al ingresar, el servidor entrega una «llave» aleatoria en una cookie HttpOnly: el
// JavaScript de la página no la puede leer, así que un script inyectado no podría robarla.
// Las sesiones viven en memoria: si el servidor se reinicia, hay que volver a ingresar.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Qué puede ver cada rol. */
export const ROLES = {
  // Juli coordina el proyecto: todo, sin ocultar cantidades, con el control y el Excel completo.
  juli: { nombre: 'Juli', encuestas: ['adultos', 'adolescentes'], umbral: 1, control: true, excelCompleto: true },
  // Grupo de Administración Financiera: resultados de adultos con la regla de anonimato.
  adultos: { nombre: 'Grupo de Administración Financiera', encuestas: ['adultos'], umbral: 5, control: false, excelCompleto: false },
  // Docentes de la escuela: resultados de adolescentes con la regla de anonimato.
  docentes: { nombre: 'Docentes', encuestas: ['adolescentes'], umbral: 5, control: false, excelCompleto: false },
};

export const LARGO_MINIMO_CLAVE = 12;
const OCHO_HORAS = 8 * 60 * 60 * 1000;

// Se comparan huellas SHA-256 (siempre 32 bytes) con timingSafeEqual: tarda lo mismo
// acierte o no, así nadie puede adivinar la contraseña midiendo cuánto tarda la respuesta.
const huella = (texto) => createHash('sha256').update(String(texto), 'utf8').digest();

/**
 * @param {{ claves: Record<string, string | undefined>, duracionMs?: number, reloj?: () => number }} opciones
 *   claves: { juli, adultos, docentes } — vacía o ausente = acceso deshabilitado.
 */
export function crearAcceso({ claves, duracionMs = OCHO_HORAS, reloj = Date.now }) {
  const habilitadas = Object.keys(ROLES)
    .filter((rol) => typeof claves[rol] === 'string' && claves[rol].length > 0)
    .map((rol) => ({ rol, huella: huella(claves[rol]) }));
  const sesiones = new Map();

  return {
    /** Roles con contraseña cargada. */
    habilitados: () => habilitadas.map((h) => h.rol),

    /** Devuelve el rol de esa contraseña, o null. Recorre TODAS para tardar siempre lo mismo. */
    rolDeClave(clave) {
      if (typeof clave !== 'string' || clave.length === 0) return null;
      const intento = huella(clave);
      let encontrado = null;
      for (const h of habilitadas) if (timingSafeEqual(intento, h.huella) && !encontrado) encontrado = h.rol;
      return encontrado;
    },

    abrirSesion(rol) {
      const token = randomBytes(32).toString('base64url');
      sesiones.set(token, { rol, vence: reloj() + duracionMs });
      return token;
    },

    /** La sesión de ese token, o null si no existe o venció. */
    sesion(token) {
      if (!token) return null;
      const s = sesiones.get(token);
      if (!s) return null;
      if (s.vence <= reloj()) {
        sesiones.delete(token);
        return null;
      }
      return { rol: s.rol, ...ROLES[s.rol] };
    },

    cerrarSesion(token) {
      sesiones.delete(token);
    },
  };
}

/** Avisos de configuración para mostrar al arrancar (claves cortas o repetidas). */
export function revisarClaves(claves) {
  const avisos = [];
  const cargadas = Object.entries(claves).filter(([, c]) => c);
  for (const [rol, clave] of cargadas) {
    if (clave.length < LARGO_MINIMO_CLAVE) avisos.push(`La contraseña de «${rol}» es corta: usá al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
  }
  const valores = cargadas.map(([, c]) => c);
  if (new Set(valores).size !== valores.length) avisos.push('Hay dos roles con la misma contraseña: cada uno tiene que tener la suya.');
  return avisos;
}

/** Lee una cookie del encabezado (sin dependencias extra). */
export function leerCookie(req, nombre) {
  const encabezado = req.headers.cookie ?? '';
  for (const parte of encabezado.split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave === nombre) return resto.join('=');
  }
  return null;
}
