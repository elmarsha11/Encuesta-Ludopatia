// Backup: la copia tiene exactamente las mismas filas que el original, y se puede usar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente, inicializarBase } from '../db/conexion.js';
import { respaldar } from '../db/respaldo.js';
import { ENCUESTAS } from '../encuestas/index.js';
import { poblar, EDADES } from '../../scripts/generar-ejemplos-dashboard.js';

test('backup: copia todas las tablas fila por fila, con su id y su fecha', async () => {
  const origen = crearCliente({ url: ':memory:' });
  await inicializarBase(origen, ENCUESTAS);
  await poblar(origen, ENCUESTAS.adultos, 30, EDADES.adultos);
  await poblar(origen, ENCUESTAS.adolescentes, 25, EDADES.adolescentes);

  const destino = crearCliente({ url: ':memory:' });
  const copiadas = await respaldar(origen, destino, ENCUESTAS);

  assert.equal(copiadas.respuestas_adultos, 30);
  assert.equal(copiadas.respuestas_adolescentes, 25);
  assert.ok(copiadas.eventos > 0);
  for (const tabla of Object.keys(copiadas)) {
    const leer = async (db) => (await db.execute(`SELECT * FROM ${tabla} ORDER BY id`)).rows.map((f) => ({ ...f }));
    assert.deepEqual(await leer(destino), await leer(origen), `la tabla ${tabla} no quedó igual`);
  }
  // La copia es una base válida: el servidor arrancaría con ella.
  await inicializarBase(destino, ENCUESTAS);
  origen.close();
  destino.close();
});
