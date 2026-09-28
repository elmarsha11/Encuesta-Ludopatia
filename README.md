# Encuesta-Ludopatia

Sistema propio de encuestas anónimas sobre ludopatía, con dos encuestas:

- **Adultos (18+)**: estudiantes de un instituto terciario. Incluye el índice PGSI.
- **Adolescentes (12-17)**: migración del formulario "¿Cuándo el juego deja de ser un juego?".

El plan completo, con decisiones y pendientes, está en [`docs/PLAN-encuesta-ludopatia.md`](docs/PLAN-encuesta-ludopatia.md).

## Cómo correrlo

Requiere Node.js 20 o superior.

```bash
npm install
cp .env.example .env     # y completar los valores
npm run dev              # servidor en http://localhost:3000, se reinicia al guardar cambios
                         # encuesta de adolescentes: http://localhost:3000/adolescentes/
                         # encuesta de adultos:       http://localhost:3000/adultos/
npm test                 # corre todas las pruebas automáticas
npm run resultados -- adultos   # resultados en la terminal (--control, --sin-ocultar)
npm run ejemplos-dashboard      # regenera los datos de ejemplo del dashboard (inventados)
                                # resultados: http://localhost:3000/resultados/ (CLAVE_* en .env)
```

## Probar en tu PC, con datos inventados

```bash
npm run prueba
```

Arranca un servidor de prueba con su propia base (`datos-prueba.db`, que nunca se sube a GitHub), la llena con respuestas **inventadas** la primera vez, deja las encuestas siempre abiertas e imprime tres contraseñas de prueba para `/resultados/`. No toca la base real ni usa las contraseñas de `.env`. Para empezar de cero, borrá `datos-prueba.db`.

Desde el celular, conectado al mismo wifi: `http://<IP de la PC>:3000/adultos/` (la IP sale con `ipconfig` en Windows o `ipconfig getifaddr en0` en Mac).

## Ponerlo en internet

Paso a paso en **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**: Render (servidor, receta en `render.yaml`) + Turso (base), con una base para el piloto y otra para la semana real.

```bash
npm run qr -- https://<servicio>.onrender.com   # QR estáticos de las dos encuestas en qr/
npm run backup                                  # copia verificada de la base de .env en backups/
```

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `backend/encuestas/` | **Definición de cada encuesta** (preguntas, opciones, ramas). Es la fuente única de verdad. |
| `backend/validacion.js` | Valida una respuesta contra su definición antes de guardarla. |
| `backend/db/` | Conexión a SQLite/Turso y generación de las tablas. |
| `backend/app.js` | Rutas de la API (Express). |
| `backend/resultados/` | Cálculo de resultados para el dashboard: conteos, cruces, regla de anonimato, embudo y Excel. |
| `backend/acceso.js` | Contraseñas por rol y sesiones de los resultados. |
| `frontend/resultados/` | Página del dashboard (dirección 1a «Renglones» de `design/dashboard/`, con barra lateral y tarjetas). |
| `backend/ventanas.js` | Días y horarios de apertura (`VENTANAS_*` en `.env`). |
| `backend/test/` | Pruebas automáticas (backend y lógica del frontend). |
| `frontend/motor/` | Motor común a las dos encuestas: `logica.js` (reglas puras, con tests), `motor.js` (pantallas) y `dom.js` (construcción de elementos, compartida con el dashboard). |
| `frontend/adolescentes/` | Página, tema, tipografías y textos de interfaz de la encuesta de adolescentes. |
| `frontend/adultos/` | Lo mismo para la encuesta de adultos (tema «Papel y tinta»). |
| `design/` | Handoff de Claude Design tal como llegó (referencia). Lo que se sirve es la copia en `frontend/`. |
| `database/schema.sql` | Esquema de la base, **generado** con `npm run schema` (no editar a mano). |
| `docs/` | Plan y fuentes originales de las preguntas. |
| `docs/diseno/` | Brief de diseño, guía de Claude Design, contrato frontend/backend y contenido **generado** de cada encuesta (`npm run contenido`). |

## Cambiar una pregunta

1. Editar la encuesta en `backend/encuestas/`.
2. `npm run schema` y `npm run contenido` para regenerar `database/schema.sql` y `docs/diseno/contenido-*.md`.
3. `npm test`.

Si la base ya tiene respuestas guardadas, el servidor se niega a arrancar cuando la tabla ya no coincide con la definición. Así se evita mezclar datos viejos con columnas nuevas.
