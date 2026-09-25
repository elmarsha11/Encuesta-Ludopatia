// Punto de entrada: lee la configuración, prepara la base y abre el puerto.

import { crearApp } from './app.js';
import { crearCliente, inicializarBase } from './db/conexion.js';
import { ENCUESTAS } from './encuestas/index.js';

const db = crearCliente({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

await inicializarBase(db, ENCUESTAS);

const app = crearApp({
  db,
  encuestas: ENCUESTAS,
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
});

const puerto = Number(process.env.PORT) || 3000;
app.listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
});
