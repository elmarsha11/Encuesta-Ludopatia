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
npm test                 # corre todas las pruebas automáticas
```

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `backend/encuestas/` | **Definición de cada encuesta** (preguntas, opciones, ramas). Es la fuente única de verdad. |
| `backend/validacion.js` | Valida una respuesta contra su definición antes de guardarla. |
| `backend/db/` | Conexión a SQLite/Turso y generación de las tablas. |
| `backend/app.js` | Rutas de la API (Express). |
| `backend/ventanas.js` | Días y horarios de apertura (`VENTANAS_*` en `.env`). |
| `backend/test/` | Pruebas automáticas (backend y lógica del frontend). |
| `frontend/motor/` | Motor común a las dos encuestas: `logica.js` (reglas puras, con tests) y `motor.js` (pantallas). |
| `frontend/adolescentes/` | Página, tema, tipografías y textos de interfaz de la encuesta de adolescentes. |
| `design/` | Handoff de Claude Design tal como llegó (referencia). Lo que se sirve es la copia en `frontend/`. |
| `database/schema.sql` | Esquema de la base, **generado** con `npm run schema` (no editar a mano). |
| `docs/` | Plan y fuentes originales de las preguntas. |
| `docs/diseno/` | Brief de diseño, guía de Claude Design, contrato frontend/backend y contenido **generado** de cada encuesta (`npm run contenido`). |

## Cambiar una pregunta

1. Editar la encuesta en `backend/encuestas/`.
2. `npm run schema` y `npm run contenido` para regenerar `database/schema.sql` y `docs/diseno/contenido-*.md`.
3. `npm test`.

Si la base ya tiene respuestas guardadas, el servidor se niega a arrancar cuando la tabla ya no coincide con la definición. Así se evita mezclar datos viejos con columnas nuevas.
