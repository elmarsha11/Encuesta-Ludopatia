// Servidor de PRUEBA: para mirar todo en tu PC sin tocar la base real.
//
//   npm run prueba
//
// - Usa su propia base, datos-prueba.db (nunca la de .env), y la llena con respuestas
//   INVENTADAS la primera vez.
// - Las encuestas quedan siempre abiertas (no lee las franjas horarias de .env).
// - Contraseñas de prueba conocidas, que se muestran al arrancar. No sirven en el
//   servidor real: ahí se usan las de .env.
// - Si cambiaron las preguntas, la base vieja ya no coincide: se descarta y se vuelve a
//   crear (tiene solo datos inventados, no se pierde nada). Para empezar de cero a mano,
//   borrá el archivo datos-prueba.db.

import { existsSync, rmSync } from 'node:fs';
import { crearCliente, inicializarBase } from '../backend/db/conexion.js';
import { ENCUESTAS } from '../backend/encuestas/index.js';
import { poblar, EDADES } from './generar-ejemplos-dashboard.js';

const ARCHIVO = 'datos-prueba.db';

async function coincideConLasEncuestas() {
  const db = crearCliente({ url: `file:${ARCHIVO}` });
  try {
    await inicializarBase(db, ENCUESTAS);
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

let motivo = 'existente';
if (existsSync(ARCHIVO) && !(await coincideConLasEncuestas())) {
  rmSync(ARCHIVO);
  motivo = 'recreada: cambiaron las preguntas';
}
const nueva = !existsSync(ARCHIVO);

if (nueva) {
  if (motivo === 'existente') motivo = 'recién creada';
  const db = crearCliente({ url: `file:${ARCHIVO}` });
  await inicializarBase(db, ENCUESTAS);
  console.log('Creando datos de prueba (inventados)…');
  await poblar(db, ENCUESTAS.adultos, 84, EDADES.adultos);
  await poblar(db, ENCUESTAS.adolescentes, 91, EDADES.adolescentes);
  db.close();
}

const CLAVES = { CLAVE_JULI: 'prueba-juli-2026', CLAVE_ADULTOS: 'prueba-grupo-2026', CLAVE_DOCENTES: 'prueba-docentes-2026' };
Object.assign(process.env, { DATABASE_URL: `file:${ARCHIVO}`, DATABASE_AUTH_TOKEN: '', VENTANAS_ADULTOS: '', VENTANAS_ADOLESCENTES: '', ...CLAVES });

console.log(`
  SERVIDOR DE PRUEBA · base ${ARCHIVO} (${motivo}, datos inventados)
  Contraseñas de prueba para /resultados/:
    Juli:      ${CLAVES.CLAVE_JULI}
    Grupo:     ${CLAVES.CLAVE_ADULTOS}
    Docentes:  ${CLAVES.CLAVE_DOCENTES}
`);

await import('../backend/server.js');
