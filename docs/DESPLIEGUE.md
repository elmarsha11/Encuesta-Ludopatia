# Guía de despliegue

Cómo poner las encuestas en internet, hacer el piloto, abrir la semana real y cerrar.
Cada paso termina con **✔ Comprobá**: no sigas al siguiente hasta que se cumpla.

Piezas:

- **Render** corre el servidor (plan gratuito). Lee la receta de `render.yaml`.
- **Turso** guarda las respuestas (base SQLite en la nube, plan gratuito).
- Tu **notebook**: generar los QR y hacer los backups.

> **Por qué la base no puede estar en Render.** El servidor gratuito se duerme tras 15
> minutos sin visitas, y al dormirse **se borra su disco**. Por eso las respuestas viven en
> Turso. El código se niega a arrancar en Render con una base local, para que este error
> no pueda pasar sin que nadie se entere.

---

## 1. Turso: dos bases, «piloto» y «real»

La tabla de respuestas **no deja borrar filas** (protege los datos reales). Por eso las
respuestas del piloto van a una base aparte: si fueran a la real, quedarían mezcladas para
siempre.

1. Entrá a turso.tech y creá una cuenta (podés usar tu cuenta de GitHub).
2. Creá una base llamada `encuestas-piloto`. Como ubicación elegí la de **EE. UU. este
   (Virginia)**: tiene que estar cerca del servidor de Render, porque cada respuesta viaja
   servidor ↔ base.
3. Creá otra base, `encuestas-real`, en la misma ubicación.
4. De **cada** base anotá dos cosas en un lugar seguro, no en GitHub ni en un chat:
   - la **URL** (empieza con `libsql://`);
   - un **token** con permiso de lectura y escritura. Si te pide vencimiento, que venza
     después de diciembre.

✔ **Comprobá:** tenés 2 URL y 2 tokens, y sabés cuál es de qué base.

## 2. Render: crear el servicio

1. Entrá a render.com y creá una cuenta con tu GitHub.
2. **New → Blueprint** y elegí el repositorio `Encuesta-Ludopatia`. Render lee `render.yaml`
   y te pide los valores marcados como secretos.
3. Completá **para el piloto**:

   | Variable | Valor en el piloto |
   |---|---|
   | `DATABASE_URL` | la URL de `encuestas-piloto` |
   | `DATABASE_AUTH_TOKEN` | el token de `encuestas-piloto` |
   | `VENTANAS_ADOLESCENTES` | vacío (abierta siempre: es el piloto) |
   | `VENTANAS_ADULTOS` | vacío |
   | `CLAVE_JULI` | tu contraseña real (12+ caracteres) |
   | `CLAVE_ADULTOS` | **vacío** (se carga al cerrar) |
   | `CLAVE_DOCENTES` | **vacío** (se carga al cerrar) |

   `TRUST_PROXY=1` y `NODE_VERSION` ya vienen en la receta: no los toques.
4. Creá el servicio y esperá que termine el primer despliegue (unos minutos).

Si el Blueprint diera un error, creá el servicio a mano (**New → Web Service**) con los
mismos valores de `render.yaml`: build `npm ci --omit=dev`, start `npm start`, health check
`/api/salud` y las mismas variables.

✔ **Comprobá:**
- En **Logs** aparece `Accesos a resultados habilitados: juli`, y dos avisos de «SIEMPRE
  abierta» (en el piloto es lo esperado).
- `https://<tu-servicio>.onrender.com/api/salud` muestra `{"ok":true}`.
- Desde tu **celular con datos móviles** (no con el wifi de tu casa) abren `/adolescentes/`
  y `/adultos/`, y en la barra del navegador está el candado.
- En `/resultados/` entrás con tu contraseña, y **el grupo y los docentes no pueden
  entrar** (su acceso todavía no existe).

La dirección `https://<tu-servicio>.onrender.com` ya no cambia: anotala.

## 3. QR

En la notebook, dentro de la carpeta del proyecto:

```
git pull
npm install
npm run qr -- https://<tu-servicio>.onrender.com
```

Quedan en `qr/`: un PNG grande para imprimir y un SVG por encuesta. Son QR **estáticos**:
contienen la dirección directa y no vencen nunca. No uses generadores web, que suelen
hacer QR «dinámicos» que se desactivan al terminar la prueba gratis.

✔ **Comprobá:** escaneá cada QR **impreso** con dos celulares distintos y verificá que cada
uno abre su encuesta.

## 4. Piloto (3 a 5 personas por encuesta)

Con los textos definitivos (PGSI, salario mínimo, líneas de ayuda). Pedí a cada persona
que responda desde su celular y anotá cuánto tardó y dónde dudó. En **Resultados → Control**
ves dónde se fue la gente.

Después del piloto **las preguntas se congelan**:

- Los **textos** se pueden corregir en cualquier momento: no se guardan en la base.
- Los **valores** de las opciones y las preguntas no se tocan más. La base real, al
  crearse, anota qué valores acepta cada columna. Si cambiaran después, el servidor se
  niega a arrancar (es a propósito: frena antes de perder respuestas).

## 5. Pasar a la base real (sábado 17 o domingo 18/10)

En Render → tu servicio → **Environment**:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la URL de `encuestas-real` |
| `DATABASE_AUTH_TOKEN` | el token de `encuestas-real` |
| `VENTANAS_ADOLESCENTES` | `2026-10-19 08:00-22:00; 2026-10-20 08:00-22:00; 2026-10-21 08:00-22:00; 2026-10-22 08:00-22:00; 2026-10-23 08:00-22:00` |
| `VENTANAS_ADULTOS` | `2026-10-19 08:00-22:00; 2026-10-20 08:00-22:00; 2026-10-21 08:00-22:00; 2026-10-22 08:00-22:00; 2026-10-23 08:00-22:00` |

Las dos encuestas abren de **8:00 a 22:00, hora argentina**, del lunes 19 al viernes 23.
Se copia tal cual, sin comillas. A las 22:00 ya no se puede **empezar**, pero quien estaba
respondiendo puede **enviar** hasta las 22:15 (tolerancia de 15 minutos, `TOLERANCIA_MINUTOS`
en `backend/ventanas.js`). Si en el piloto alguien tarda más de 15 minutos, conviene subirla.

Guardá: Render reinicia el servicio con los valores nuevos.

✔ **Comprobá:**
- En los Logs **ya no** aparecen los avisos de «SIEMPRE abierta».
- En `/resultados/` dice **«Todavía no hay respuestas»**. Eso prueba que estás en la base
  limpia.
- Fuera del horario, las encuestas muestran «La encuesta está cerrada» y cuándo abre.

## 6. Semana de encuesta (19 al 23/10)

**Despertador.** Creá una cuenta gratis en cron-job.org y, en su configuración, poné la zona
horaria **America/Argentina/Buenos_Aires**. Después creá una tarea que visite
`https://<tu-servicio>.onrender.com/api/salud`:

- cada **10 minutos**;
- solo de **7:00 a 22:10** (arranca una hora antes de abrir, así a las 8 ya está despierto,
  y sigue durante la tolerancia de envío);
- solo del **lunes 19 al viernes 23**. Después desactivala.

De noche nadie lo visita: Render lo duerme solo a los 15 minutos y no gasta horas. **No lo
suspendas a mano**: si un día te olvidás de reactivarlo, a las 8 no hay encuesta. Si alguien
entra de noche, espera un minuto a que despierte y ve que la encuesta está cerrada y a qué
hora abre.

Cuentas: unas 15 horas × 5 días ≈ 78 horas, de las 750 gratis por mes. El resto sobra para
el piloto y para consultar resultados.

**Durante el horario de encuesta:**
- Seguí la participación en **Resultados → Control**. Compará cada día con cuánta gente
  recibió el QR: más respuestas que personas posibles (o un salto raro en un solo día) es
  señal de respuestas falsas. Anotalo para el informe.
- **No mergees cambios a `main` entre las 8 y las 22.** Render publica solo cada vez que
  cambia `main`, y al reiniciar se cierran las sesiones de resultados.

**Cada noche, backup.** En la notebook, en un archivo `.env` (nunca va a GitHub) poné:

```
DATABASE_URL=<URL de encuestas-real>
DATABASE_AUTH_TOKEN=<token de encuestas-real>
```

y corré:

```
npm run backup
```

Queda un archivo en `backups/` y el script verifica que tenga las mismas filas que
Turso. Guardá una copia también **fuera de la notebook** (un pendrive). Tiene respuestas
reales: no lo subas a ninguna nube compartida ni lo mandes por chat.

## 7. Cierre y entrega

1. Último backup (`npm run backup`).
2. En Render → **Environment**, cargá `CLAVE_ADULTOS` y `CLAVE_DOCENTES` (12+ caracteres,
   distintas entre sí y de la tuya).
3. Mandá **la dirección y la contraseña por canales distintos**: por ejemplo, el link por
   mail y la contraseña en persona.
4. Confirmá que el despertador quedó desactivado. Si alguien entra y el servidor está dormido, tarda un minuto
   en abrir: es normal.
5. Cuando todos tengan su Excel: borrá las contraseñas del grupo y de docentes en Render,
   y decidí con el grupo cuándo se borran las bases de Turso (el plan dice: backup y apagado).

## Si algo sale mal

| Mensaje en los Logs de Render | Qué significa |
|---|---|
| `DATABASE_URL apunta a un archivo local…` | Falta la URL de Turso: cargala en Environment. |
| `La tabla … no coincide con la definición…` | Se cambió una pregunta o sus opciones después de crear esa base. No toques la base: hacé un backup y volvé la pregunta a como estaba. |
| `Falta DATABASE_URL` | La variable está vacía. |
| El servicio dice *Suspended* | Se agotaron las horas gratis del mes: revisá que el despertador no quedó prendido. |

## Seguridad: qué está cubierto y qué no

Cubierto por el código:
- HTTPS (lo da Render).
- El navegador solo carga recursos de nuestro servidor (CSP), y ningún texto se inserta
  como código.
- El servidor valida todo lo que llega; las respuestas no se pueden modificar ni borrar.
- No se guardan IPs ni horarios, solo la fecha.
- Las contraseñas se comparan de forma segura, y la sesión va en una cookie que el
  JavaScript de la página no puede leer.
- En los resultados, las cantidades menores a 5 no se muestran.

Limitación conocida (para el informe): **cualquiera que tenga la dirección puede responder,
y más de una vez.** Pedir identificación rompería el anonimato. Lo acotan el horario
(8 a 22, solo esa semana), el reparto del QR solo a quienes tienen que responder, el límite
de envíos por minuto y el seguimiento en Control.
