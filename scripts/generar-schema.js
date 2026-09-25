// Escribe database/schema.sql a partir de las definiciones de las encuestas.
// Uso: npm run schema

import { writeFileSync } from 'node:fs';
import { ENCUESTAS } from '../backend/encuestas/index.js';
import { scriptCompleto } from '../backend/db/esquema.js';

const destino = new URL('../database/schema.sql', import.meta.url);
writeFileSync(destino, scriptCompleto(ENCUESTAS));
console.log('database/schema.sql actualizado');
