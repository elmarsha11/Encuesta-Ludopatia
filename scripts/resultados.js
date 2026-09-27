// Muestra en la terminal los resultados de una encuesta, tal como los va a ver el dashboard.
//
//   npm run resultados -- adultos                 (con la regla de anonimato, como el grupo)
//   npm run resultados -- adultos --control       (+ embudo de participación y días)
//   npm run resultados -- adultos --sin-ocultar   (sin ocultar cantidades chicas: solo Juli)
//
// Lee la base de DATABASE_URL (.env). Quien tiene el archivo de la base ya tiene todo,
// así que este comando no agrega ningún acceso nuevo.

import { crearCliente } from '../backend/db/conexion.js';
import { ENCUESTAS } from '../backend/encuestas/index.js';
import { resultados } from '../backend/resultados/index.js';

const [id, ...banderas] = process.argv.slice(2);
const encuesta = ENCUESTAS[id];
if (!encuesta) {
  console.error(`Uso: npm run resultados -- <${Object.keys(ENCUESTAS).join('|')}> [--control] [--sin-ocultar]`);
  process.exit(1);
}

const db = crearCliente({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
const r = await resultados(db, encuesta, {
  umbral: banderas.includes('--sin-ocultar') ? 1 : undefined,
  control: banderas.includes('--control'),
});

const cantidad = (n, base) => (n === null ? 'oculto (< 5)' : base ? `${n} (${Math.round((n / base) * 100)}%)` : String(n));

console.log(`\n${r.titulo}: ${r.respuestas} respuestas${r.umbral > 1 ? ` · se ocultan cantidades menores a ${r.umbral}` : ''}\n`);
for (const d of r.distribuciones) {
  console.log(`${d.texto}  [base: ${d.base ?? 'oculta'}]`);
  for (const c of d.celdas) console.log(`   ${c.texto.padEnd(46)} ${cantidad(c.n, d.base)}`);
}
console.log('\nCRUCES (se leen por fila; muestran asociaciones, no causas)');
for (const c of r.cruces) {
  console.log(`\n${c.resultado} según ${c.factor.toLowerCase()}`);
  for (const f of c.filas) {
    const partes = f.celdas.map((x) => `${x.texto}: ${cantidad(x.n, f.base)}`).join(' · ');
    console.log(`   ${f.texto.padEnd(40)} [base: ${f.base ?? 'oculta'}] ${partes}`);
  }
}
if (r.control) {
  const e = r.control.embudo;
  console.log(`\nCONTROL · entraron ${e.entraron} · aceptaron ${e.aceptaron} · no participaron ${e.noParticiparon} · edad fuera de rango ${e.edadFueraDeRango} · enviaron ${e.completaron}`);
  for (const t of e.tramos.filter((x) => x.seFueron > 0)) console.log(`   Se fueron ${t.seFueron} entre «${t.desde}» y «${t.hasta}»`);
  for (const d of r.control.porDia) console.log(`   ${d.fecha}: entraron ${d.entraron}, enviaron ${d.completaron}`);
}
db.close();
