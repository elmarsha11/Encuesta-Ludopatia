// Ventanas de apertura: en qué días y horarios se puede responder cada encuesta.
//
// Se configuran con una variable de entorno por encuesta, en hora argentina:
//   VENTANAS_ADOLESCENTES="2026-10-19 08:00-12:00; 2026-10-20 08:00-12:00"
// Si la variable no existe, la encuesta está SIEMPRE abierta (útil para desarrollo).

// Minutos de tolerancia después del cierre: quien empezó a responder un minuto antes
// de que cierre la franja tiene que poder enviar igual.
export const TOLERANCIA_MINUTOS = 15;

const FORMATO = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/;

/**
 * Convierte el texto de configuración en una lista de { inicio, fin } (objetos Date).
 * Lanza un error si el formato es inválido: mejor que el servidor no arranque
 * a que la encuesta quede abierta o cerrada por un error de tipeo.
 */
export function leerVentanas(texto) {
  if (!texto || !texto.trim()) return null;
  return texto
    .split(';')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const m = parte.match(FORMATO);
      if (!m) throw new Error(`Ventana con formato inválido: "${parte}" (esperado "AAAA-MM-DD HH:MM-HH:MM")`);
      const [, dia, desde, hasta] = m;
      // Argentina: UTC-3 todo el año (sin horario de verano).
      const inicio = new Date(`${dia}T${desde}:00-03:00`);
      const fin = new Date(`${dia}T${hasta}:00-03:00`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) {
        throw new Error(`Ventana inválida: "${parte}"`);
      }
      return { inicio, fin };
    })
    .sort((a, b) => a.inicio - b.inicio);
}

/**
 * Estado de apertura en un momento dado.
 * @param {{inicio: Date, fin: Date}[] | null} ventanas - null = siempre abierta
 * @returns {{ abierta: boolean, aceptaEnvios: boolean, proximaApertura: string | null }}
 */
export function estadoDeApertura(ventanas, ahora) {
  if (!ventanas) return { abierta: true, aceptaEnvios: true, proximaApertura: null };

  const tolerancia = TOLERANCIA_MINUTOS * 60_000;
  const abierta = ventanas.some((v) => ahora >= v.inicio && ahora < v.fin);
  const aceptaEnvios = ventanas.some(
    (v) => ahora >= v.inicio && ahora.getTime() < v.fin.getTime() + tolerancia,
  );
  const proxima = ventanas.find((v) => v.inicio > ahora);
  return {
    abierta,
    aceptaEnvios,
    proximaApertura: abierta || !proxima ? null : proxima.inicio.toISOString(),
  };
}
