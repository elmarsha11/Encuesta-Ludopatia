# Contrato entre frontend y backend

> Para quien implemente el frontend (Claude Code después del handoff de Claude Design).
> Todo lo que está acá lo hace cumplir el backend: si el frontend se aparta, el envío se rechaza con un 400.

## Rutas

| Ruta | Qué es |
|---|---|
| `/adolescentes` | Página de la encuesta de adolescentes (QR 1) |
| `/adultos` | Página de la encuesta de adultos (QR 2) |
| `GET /api/encuestas/:id` | Definición de la encuesta (`adultos` o `adolescentes`) |
| `POST /api/respuestas/:id` | Envío de una respuesta completa |

## 1. Definición (`GET /api/encuestas/:id`)

Devuelve `{ id, titulo, respuestasObligatorias, smvmReferencia, pantallas, secciones, preguntas, abierta, proximaApertura }`.

- `abierta`: `false` fuera de los días y horarios configurados. En ese caso se muestra la pantalla de encuesta cerrada.
- `proximaApertura`: fecha ISO de la próxima franja, o `null` si ya no quedan.
- `pantallas.intro` puede traer `puntos: [{ destacado, texto }]` y `cierre`, además de `texto`.

Cada pregunta tiene:

| Campo | Significado |
|---|---|
| `id` | Clave con la que se envía la respuesta |
| `seccion` | Id de la sección a la que pertenece (las preguntas vienen en orden) |
| `tipo` | `numero`, `unica`, `multiple`, `escala`, `texto` o `info` |
| `texto` | Enunciado. En `info`, además hay un `titulo` |
| `opciones` | En `unica` y `multiple`: `[{ valor, texto, exclusiva?, grupo? }]` |
| `min`, `max`, `etiquetas` | En `numero` y `escala`. `etiquetas` es `{ valor: texto }` (a veces solo para los extremos) |
| `presentacion` | `'slider'` en algunas escalas de adultos |
| `maxLargo` | En `texto` |
| `ayuda` | Nota opcional «¿Por qué preguntamos esto?» |
| `obligatoria` | Si está presente, pisa a `respuestasObligatorias` de la encuesta |
| `visibleSi` | `{ pregunta, es: [valores] }`: se muestra solo si la respuesta a `pregunta` es uno de esos valores |

**Regla de visibilidad:** una pregunta es visible si no tiene `visibleSi`, o si la respuesta actual a `visibleSi.pregunta` está en `visibleSi.es`. Hay que recalcularla cada vez que cambia una respuesta: si la persona vuelve atrás y cambia de rama, **se descartan** las respuestas de la rama anterior.

## 2. Envío (`POST /api/respuestas/:id`)

Cuerpo JSON con **solo las preguntas visibles que tienen respuesta**:

| Tipo | Formato del valor |
|---|---|
| `numero`, `escala` | Número entero (no string): `24`, no `"24"` |
| `unica` | El `valor` de la opción: `"si"` |
| `multiple` | Lista de `valor`es: `["redes", "tv"]`. Si no marcó nada, **no enviar la clave** |
| `texto` | String |
| `info` | No se envía nada |

- No enviar preguntas no visibles (400: «no corresponde a las respuestas anteriores»).
- No enviar claves desconocidas (400: «campo desconocido»). El consentimiento **no** se envía: si la persona dice que no, no se llama al POST.
- Una opción `exclusiva` nunca va junto con otras.

**Respuestas posibles:**

| Código | Qué hacer |
|---|---|
| `201 { ok: true }` | Mostrar la pantalla final y borrar el borrador guardado |
| `400 { ok: false, errores: [...] }` | Es un error del frontend: registrarlo en la consola y mostrar un mensaje genérico |
| `403 { cerrada: true, proximaApertura }` | La franja cerró (pasados los 15 minutos de tolerancia): mostrar la pantalla de encuesta cerrada |
| `429` | Demasiados envíos: esperar y reintentar sin perder las respuestas |
| `5xx` / sin conexión | Reintento manual con un botón, sin perder las respuestas |

## 3. Otros requisitos

- Guardar el progreso en `sessionStorage` para que recargar la página no borre lo respondido. Borrarlo al recibir el 201.
- Validar en el cliente con las mismas reglas (rango, obligatoriedad, exclusivas) para dar feedback inmediato. **El backend valida igual.**
- Sin recursos externos: tipografías, íconos y scripts servidos desde el propio servidor.
