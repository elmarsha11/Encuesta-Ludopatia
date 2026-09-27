// Genera los datos de ejemplo del dashboard (docs/diseno/dashboard/ejemplo-*.json).
//
// Las respuestas son INVENTADAS: se crean al azar en una base en memoria que se descarta
// al terminar. Nunca se lee ni se toca la base real. Sirven para diseñar el dashboard con
// datos que tienen la forma exacta que va a entregar el servidor (incluidas las celdas
// ocultas por anonimato), con tamaños parecidos a los esperados (70 a 100 por encuesta).
//
//   npm run ejemplos-dashboard

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { crearCliente, inicializarBase, guardarRespuesta, guardarEvento } from '../backend/db/conexion.js';
import { ENCUESTAS } from '../backend/encuestas/index.js';
import { esVisible } from '../backend/encuestas/condiciones.js';
import { validarRespuesta } from '../backend/validacion.js';
import { resultados } from '../backend/resultados/index.js';

// Azar con semilla: cada vez que se corre sale lo mismo, así los ejemplos no cambian solos.
let semilla = 20261019;
const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

// Algunas respuestas con probabilidades parecidas a la realidad esperada.
const PESOS = {
  aposto_12m: { si: 0.3, no: 0.66, prefiero_no_responder: 0.04 },
  aposto_alguna_vez: { nunca: 0.62, si_no_ultimo_anio: 0.14, si_ultimo_anio: 0.2, prefiero_no_responder: 0.04 },
  tiene_deudas: { si: 0.45, no: 0.5, prefiero_no_responder: 0.05 },
};
const ponderado = (pesos) => {
  let r = azar();
  for (const [valor, p] of Object.entries(pesos)) if ((r -= p) <= 0) return valor;
  return Object.keys(pesos)[0];
};

function respuestaAlAzar(encuesta, { minEdad, maxEdad }) {
  const r = {};
  for (const p of encuesta.preguntas) {
    if (p.tipo === 'info' || p.tipo === 'texto' || !esVisible(p, r)) continue;
    if (!encuesta.respuestasObligatorias && p.id !== 'edad' && azar() < 0.08) continue; // alguna salteada
    if (p.tipo === 'numero') r[p.id] = minEdad + Math.floor(azar() * (maxEdad - minEdad + 1));
    else if (p.tipo === 'unica') r[p.id] = PESOS[p.id] ? ponderado(PESOS[p.id]) : elegir(p.opciones).valor;
    else if (p.tipo === 'escala') {
      if (p.opcionNoResponde && azar() < 0.05) r[p.id] = p.opcionNoResponde.valor;
      // PGSI: la mayoría responde «Nunca» o «A veces».
      else r[p.id] = p.min === 0 ? Math.min(p.max, Math.floor(azar() * azar() * 4)) : p.min + Math.floor(azar() * (p.max - p.min + 1));
    } else if (p.tipo === 'multiple') {
      const comunes = p.opciones.filter((o) => !o.exclusiva);
      const exclusiva = p.opciones.find((o) => o.exclusiva);
      if (exclusiva && azar() < 0.1) r[p.id] = [exclusiva.valor];
      else {
        const elegidas = new Set([elegir(comunes).valor]);
        if (azar() < 0.5) elegidas.add(elegir(comunes).valor);
        r[p.id] = p.opciones.map((o) => o.valor).filter((v) => elegidas.has(v));
      }
    }
  }
  return r;
}

/** Carga respuestas y eventos inventados en una base ya inicializada (también la usan las pruebas en navegador). */
export async function poblar(db, encuesta, cantidad, edades) {
  const evento = (e, pregunta) => guardarEvento(db, encuesta, { evento: e, pregunta });

  for (let i = 0; i < cantidad; i++) {
    const cuerpo = respuestaAlAzar(encuesta, edades);
    const r = validarRespuesta(encuesta, cuerpo);
    if (!r.ok) throw new Error(`Respuesta de ejemplo inválida: ${r.errores.join('; ')}`);
    await evento('entro');
    await evento('acepto');
    for (const p of encuesta.preguntas) if (p.tipo === 'info' || cuerpo[p.id] !== undefined || (p.tipo === 'texto' && esVisible(p, cuerpo)) || (!p.visibleSi && !encuesta.respuestasObligatorias)) await evento('vio', p.id);
    await guardarRespuesta(db, encuesta, r.fila);
  }
  // Algunos no participan y otros abandonan a mitad de camino.
  for (let i = 0; i < Math.round(cantidad * 0.08); i++) {
    await evento('entro');
    await evento('no_participa');
  }
  for (let i = 0; i < Math.round(cantidad * 0.1); i++) {
    await evento('entro');
    await evento('acepto');
    const hasta = 2 + Math.floor(azar() * 8);
    for (const p of encuesta.preguntas.filter((q) => !q.visibleSi).slice(0, hasta)) await evento('vio', p.id);
  }
  await evento('edad_fuera');
}

async function generar(encuesta, cantidad, edades) {
  const db = crearCliente({ url: ':memory:' });
  await inicializarBase(db, ENCUESTAS);
  await poblar(db, encuesta, cantidad, edades);
  const paraGrupo = await resultados(db, encuesta);
  const paraJuli = await resultados(db, encuesta, { umbral: 1, control: true });
  db.close();
  return { paraGrupo, paraJuli };
}

export const EDADES = { adultos: { minEdad: 18, maxEdad: 52 }, adolescentes: { minEdad: 12, maxEdad: 17 } };

// Solo genera los archivos si se ejecuta como script (no al importarlo).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const DESTINO = new URL('../docs/diseno/dashboard/', import.meta.url);
  const guardar = (nombre, datos) => writeFileSync(new URL(nombre, DESTINO), `${JSON.stringify(datos, null, 2)}\n`);

  const adultos = await generar(ENCUESTAS.adultos, 84, EDADES.adultos);
  const adolescentes = await generar(ENCUESTAS.adolescentes, 91, EDADES.adolescentes);
  guardar('ejemplo-adultos-grupo.json', adultos.paraGrupo);
  guardar('ejemplo-adultos-juli.json', adultos.paraJuli);
  guardar('ejemplo-adolescentes-docentes.json', adolescentes.paraGrupo);
  guardar('ejemplo-adolescentes-juli.json', adolescentes.paraJuli);
  console.log('Ejemplos generados en docs/diseno/dashboard/ (datos inventados).');
}
