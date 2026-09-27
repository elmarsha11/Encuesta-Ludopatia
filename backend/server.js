// Punto de entrada: lee la configuración, prepara la base y abre el puerto.

import { crearApp } from './app.js';
import { crearCliente, inicializarBase } from './db/conexion.js';
import { ENCUESTAS } from './encuestas/index.js';
import { leerVentanas } from './ventanas.js';
import { crearAcceso, revisarClaves } from './acceso.js';

const db = crearCliente({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

await inicializarBase(db, ENCUESTAS);

// Ventanas de apertura: VENTANAS_ADOLESCENTES, VENTANAS_ADULTOS (ver .env.example).
const ventanas = {};
for (const id of Object.keys(ENCUESTAS)) {
  ventanas[id] = leerVentanas(process.env[`VENTANAS_${id.toUpperCase()}`]);
  if (!ventanas[id]) console.warn(`Aviso: la encuesta "${id}" no tiene ventanas configuradas: está SIEMPRE abierta.`);
}

// Contraseñas de los resultados. Vacía = ese acceso no existe (ver .env.example).
const claves = { juli: process.env.CLAVE_JULI, adultos: process.env.CLAVE_ADULTOS, docentes: process.env.CLAVE_DOCENTES };
for (const aviso of revisarClaves(claves)) console.warn(`Aviso: ${aviso}`);
const acceso = crearAcceso({ claves });
console.log(`Accesos a resultados habilitados: ${acceso.habilitados().join(', ') || 'ninguno'}`);

const app = crearApp({
  db,
  encuestas: ENCUESTAS,
  ventanas,
  acceso,
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
});

const puerto = Number(process.env.PORT) || 3000;
app.listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
  console.log(`Encuesta de adolescentes: http://localhost:${puerto}/adolescentes/`);
  console.log(`Encuesta de adultos:       http://localhost:${puerto}/adultos/`);
  console.log(`Resultados:                http://localhost:${puerto}/resultados/`);
});
