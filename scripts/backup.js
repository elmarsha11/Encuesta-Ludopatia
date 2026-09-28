// Copia la base configurada en .env (DATABASE_URL, la de Turso) a backups/.
//
//   npm run backup
//
// Correrlo cada noche de la semana de encuesta. La carpeta backups/ nunca va a GitHub
// (tiene respuestas reales): guardá una copia también fuera de la notebook.

import { mkdirSync, existsSync } from 'node:fs';
import { crearCliente } from '../backend/db/conexion.js';
import { respaldar } from '../backend/db/respaldo.js';
import { ENCUESTAS } from '../backend/encuestas/index.js';

const origen = crearCliente({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });

const ahora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }); // 2026-10-19 21:30:05
const archivo = `backups/encuestas-${ahora.slice(0, 16).replace(' ', '-').replace(':', '')}.db`;
mkdirSync('backups', { recursive: true });
if (existsSync(archivo)) {
  console.error(`Ya existe ${archivo}: esperá un minuto y volvé a correrlo.`);
  process.exit(1);
}

const destino = crearCliente({ url: `file:${archivo}` });
const copiadas = await respaldar(origen, destino, ENCUESTAS);
for (const [tabla, n] of Object.entries(copiadas)) console.log(`  ${tabla}: ${n} filas`);
console.log(`Backup listo y verificado: ${archivo}`);
origen.close();
destino.close();
