# Plan Técnico — Encuestas sobre Ludopatía (Adultos 18+ y Adolescentes 12-17)

> Documento de referencia para el desarrollo. Contiene el contexto, la arquitectura y las decisiones tomadas hasta ahora.
>
> - **DECIDIDO**: confirmado por Juli, se puede codear.
> - **PROPUESTA**: recomendación técnica, falta confirmación (de Juli o del grupo de adultos).
> - **PENDIENTE**: falta información; no codear esa parte hasta cerrarla.
>
> Fuentes de las preguntas:
> - Adultos: `docs/fuentes/adultos-preguntas-1.jpeg` (datos personales, hábitos, educación financiera) y `docs/fuentes/adultos-preguntas-2-no-apuesta.jpg` (rama "no apuesta").
> - Adolescentes: `docs/fuentes/adolescentes-formulario.pdf`.

---

## 1. Contexto

Dos encuestas sobre ludopatía, para dos públicos y **dos instituciones distintas**, construidas sobre el mismo sistema propio (sin Google Forms/Sheets):

- **Encuesta de adultos (18+)**: encargada por un grupo de estudiantes de Administración Financiera de un instituto, dirigida a adultos que cursan en esa institución. Busca detectar perfiles de riesgo de ludopatía y entender qué factores contextuales los empujan a apostar. **Para los adultos las respuestas son obligatorias.**
- **Encuesta de adolescentes (12-17)**: proyecto propio de Juli, hasta ahora en Google Forms, que se migra a este sistema. **Para los menores las respuestas no son obligatorias** (se mantiene "Prefiero no responder" y preguntas que se pueden saltear).

**Restricciones comunes:**
- No usar Google Forms / Sheets / Looker Studio.
- Página web propia, alojada de forma provisoria.
- Disponible del **lunes 19 al viernes 23 de octubre de 2026** (ambas encuestas), **de 8:00 a 22:00, hora argentina** (DECIDIDO por Juli). A las 22:00 ya no se puede empezar; los envíos se aceptan 15 minutos más.
- Acceso a resultados (Excel + dashboard) restringido a quien corresponda en cada caso.
- Duración máxima de respuesta: **menos de 5 minutos**.
- Experiencia dinámica y cuidada: ni monótona ni básica, pero tampoco extravagante, y **sin ninguna estética que remita a apuestas o casinos** (nada de fichas, ruletas, dorados tipo casino, confeti de "ganaste").
- Anónimas: sin nombre, DNI ni email.
- Copy neutral, sin estigmatizar a quienes apuestan.

**Objetivo de investigación — adultos:**
- Cuántos adultos del instituto apostaron o presentan riesgo de juego problemático.
- Relación entre contexto económico/laboral y la probabilidad de apostar.
- Rangos etarios con mayor incidencia.
- Rol de la publicidad y el acceso online como facilitadores.
- No se busca comparar entre carreras (el dato se recolecta igual).

**Objetivo de investigación — adolescentes:**
- Prevalencia de apuestas (incluidas las "en especie", como skins) entre adolescentes.
- Exposición a publicidad y su relación con percibir que apostar es normal o inofensivo.
- Percepción social: por qué creen que apuestan sus pares y si creen que se puede "ganar plata".

## 2. Acceso y validación de edad (DECIDIDO)

- **Dos QR / dos URLs**, uno por encuesta (cada uno se distribuye en su institución). No hay pantalla de enrutamiento por edad.
  - `/adultos` → encuesta de adultos.
  - `/adolescentes` → encuesta de adolescentes.
- Cada encuesta pregunta la edad y **valida su propio rango**:
  - Adolescentes: **12 a 17** inclusive. (El Forms original decía "entre 12 y 18"; se corrige: 18 ya es adulto.)
  - Adultos: **18 o más**. **PROPUESTA**: tope superior de 99 para descartar errores de tipeo (ej. 188).
- Si alguien pone una edad fuera de rango (por error o a propósito), se le muestra un mensaje amable ("esta encuesta es para personas de X a Y años") y **no puede continuar**. Nada se guarda.
- El backend **vuelve a validar el rango** antes de guardar: la validación del frontend se puede saltear, la del servidor no.

## 3. Reglas de diseño de datos (DECIDIDO)

1. **Preguntas de respuesta múltiple → una columna 0/1 por opción** (ej. `tipo_casino_online`). Contar cuántos marcaron una opción es un `SUM()`, y en Excel queda una columna por opción, lista para una tabla dinámica.
2. **Columnas de preguntas no mostradas → `NULL`, nunca `0`/`FALSE` por defecto.** `NULL` significa "no se le preguntó"; `0` significa "se le preguntó y no lo marcó". Si se confunden, los porcentajes salen mal sin que nadie lo note (ej. "% que apostó en skins" dividido por todos los encuestados en vez de solo por quienes apostaron).
3. **Toda opción de la pregunta tiene su columna**, incluidas "Prefiero no responder", "No sé", "Ninguno" y "No veo publicidad".
4. **Sin columna de consentimiento**: si alguien responde "No" a "¿Aceptás participar?", el frontend corta ahí y nunca llama al endpoint de guardado.
5. **Fecha de respuesta sin hora en el Excel exportado**: edad exacta + carrera + género + hora exacta puede identificar a alguien en grupos chicos.

## 4. Encuesta de ADULTOS (18+) — versión del 29/9 (DECIDIDO)

**Qué pasó.** El grupo de Administración Financiera no aprobó la primera versión (ni las preguntas ni el formato) y pidió volver a su lista original (`docs/fuentes/adultos-preguntas-1.jpeg` y `adultos-preguntas-2-no-apuesta.jpg`). No respondió las consultas que se le hicieron. Su objetivo declarado: **«la cantidad de gente que apuesta, ni nada más»**.

**Regla para decidir.** El grupo decide *qué se pregunta*; el equipo de datos decide *cómo se guarda y cómo se ve*; por encima de los dos está **la consigna del instituto**, que es lo que se evalúa. Con esa regla:

| Pedido del grupo | Qué se hizo | Por qué |
|---|---|---|
| Lista original de preguntas | Se respeta | Es su contenido |
| Sin PGSI, ingresos ni deudas | Se sacaron | No están en su lista y su objetivo es contar |
| Sin secciones ni portadas, de a una | Una pregunta por pantalla, sin «Parte X de N» | Pedido explícito |
| «La portada no va» | Presentación corta y consentimiento en **una** pantalla | La consigna exige una «placa inicial» |
| Educación financiera al final | Al final, para todos | Pedido explícito |
| Frecuencia «múltiple» | Respuesta **única** (+ «Menos de una vez al mes») | Dato: nadie apuesta diaria y mensualmente a la vez |
| Monto como «número libre» | **Rangos** | Consigna del instituto (y un número libre no se puede agrupar) |
| (no estaba) | Se agregó **medio de pago** | Consigna del instituto |
| Preguntas para quienes no apuestan | Las 5, solo para quienes no apuestan | Consigna: «al menos tres o cuatro» |
| «¿Realizás apuestas online?» | «¿Realizás apuestas, ya sea online o presenciales?» | Después se pregunta por casino presencial: con «online» quien solo va al casino quedaría contado como «no», y es el dato principal |
| «¿Recibiste…?» antes de «¿Sabés qué es…?» | Primero «¿Sabés qué es?» | Quien no sabe qué es no puede saber si la recibió |
| Estética «demasiado formal» | Tema nuevo «Pulso» (sección 8.1) | Pedido explícito |

Respuestas obligatorias. Sin «Prefiero no responder» (no está en su lista y ya no hay preguntas de ingresos ni deudas).

```
PLACA INICIAL — presentación corta + «¿Aceptás participar?» (Sí / No) en la misma pantalla
  → edad (18–99) · carrera (12, en Profesorados / Tecnicaturas / Otras) · género (Masc / Fem / Otro)
  → condición laboral · ¿dependés económicamente de alguien? · ¿alguien depende de vos?
  → ¿Realizás apuestas, ya sea online o presenciales? (Sí / No)
     SÍ → frecuencia · tipo de apuesta (múltiple) · por qué (múltiple) · monto por vez (rangos:
          <$10.000 / $10.000–50.000 / $50.000–100.000 / >$100.000) · medio de pago (múltiple:
          efectivo, débito, crédito, billetera virtual, transferencia, otro) · origen del dinero
          (múltiple) · ¿reconocés si la plataforma es legal? · ¿incluiste a alguien?
     NO → ¿pensaste en hacerlo? · motivo principal · familiares o amigos que apuesten ·
          ¿se puede generar plata fácil? · canales de publicidad (redes, videojuegos,
          streamers, ninguno)
  → Educación financiera (todos): ¿sabés qué es? · ¿la recibiste? (→ ¿dónde?) · ¿te gustaría recibirla?
PLACA FINAL — agradecimiento + líneas de ayuda (al grupo le pareció «un gran acierto»)
```

**PENDIENTE (carreras):** el grupo lista «Tecnicatura Enfermería» y «Enfermería» por separado (se cargaron como «Enfermería» en Tecnicaturas y «Enfermería (otra)» en Otras) y escribe «ATM», que se asumió como Acompañante Terapéutico. Los textos se pueden corregir en cualquier momento; lo que no se cambia después del piloto son los valores.

## 5. Encuesta de ADOLESCENTES (12-17)

Se migra **tal cual** desde el PDF, con una sola corrección: la validación de edad pasa a ser 12-17. Todas las preguntas son salteables salvo el consentimiento y la edad (necesaria para validar el rango).

```
SECCIÓN 1 — ¿Cuándo el juego deja de ser un juego?
  Intro (texto del PDF) + "¿Te animás a participar?" (Sí / No) → No: fin sin guardar.

SECCIÓN 2 — Sobre vos...
  P2  ¿Cuál es tu edad? (número, 12–17)
  P3  ¿Cómo te percibís? (Varón / Mujer / Otro / Prefiero no decir)
  P4  ¿Alguna vez apostaste plata o algo que vale plata (por ejemplo, skins)?   ← GATILLO
      Sí, pero no en el último año / Sí, en el último año / Nunca / Prefiero no responder
      → cualquiera de los dos "Sí" → Sección 3
      → "Nunca" o "Prefiero no responder" → Sección 4

SECCIÓN 3 — Tu experiencia con las apuestas (solo rama "sí")
  P5  ¿En qué apostaste? (múltiple: Apuestas deportivas online / Casino online /
      Juego de cartas por plata / Quiniela, Lotería / Skins o cajas de videojuegos /
      Otro / Prefiero no responder)
  P6  En el último año, ¿con qué frecuencia apostaste? (única: Ninguna vez en el último año /
      Menos de una vez al mes / Algunas veces al mes / Una vez por semana /
      Varias veces a la semana / Casi todos los días / Prefiero no responder)
  P7  ¿Qué te llevó a apostar? (múltiple: Diversión / Publicidad o influencers / Curiosidad /
      Ganar plata / Aburrimiento / Amigos o familia que también apuestan / Otro / Prefiero no responder)
  P8  ¿Cómo accediste? (única: Con mi propia cuenta / Con la cuenta o datos de otra persona /
      En persona / Prefiero no responder)

SECCIÓN 4 — Tu entorno y tu opinión (TODOS)
  P9  ¿Conocés a alguien de tu entorno que apueste? (No / Sí, una persona / Sí, varias / Prefiero no responder)
  P10 ¿Con qué frecuencia ves publicidad de apuestas? (Nunca o casi nunca / Algunas veces al mes /
      Algunas veces por semana / Todos los días / No sé)
  P11 ¿Dónde ves más publicidad? (múltiple: Redes sociales / Streamers y/o influencers / TV /
      Videojuegos / La calle / No veo publicidad de apuestas)
  P12 Escala 1-5: "Es fácil perder el control con las apuestas online."
  P13 Escala 1-5: "Apostar online es un pasatiempo inofensivo."
  P14 ¿Por qué creés que apuestan las personas de tu edad? (múltiple: Diversión /
      Publicidad o influencers / Curiosidad / Ganar plata / Aburrimiento /
      Amigos o familia que también apuestan / Otro / No sé)
  P15 Escala 1-5: "Alguien de mi edad puede ganar plata apostando."
  (Escalas: 1 = Nada de acuerdo … 5 = Totalmente de acuerdo)

SECCIÓN 5 — Un breve espacio para leerte (opcional)
  P16 Texto libre. "No escribas nombres ni nada que te identifique." PROPUESTA: límite de 1000 caracteres.

PANTALLA FINAL — Agradecimiento + recursos de ayuda (ver sección 7)
```

## 6. Instrumento de riesgo: PGSI (DESCARTADO el 29/9)

Se usaba en la primera versión de adultos (9 ítems, validación española de López-González, Estévez y Griffiths, 2018). El grupo lo sacó: su objetivo es contar cuántos apuestan, no medir el riesgo. El motor conserva el componente de escala de frecuencia que lo dibujaba, probado con una encuesta de prueba (`backend/test/encuesta-de-prueba.js`), por si se vuelve a necesitar.

## 7. Consideraciones éticas

- Ninguna encuesta pide datos identificatorios.
- Copy neutral, sin estigmatizar.
- Consentimiento explícito al inicio de ambas.
- **Pantalla final con recursos de ayuda** (ambas instituciones están en Chascomús, provincia de Buenos Aires). Números encontrados, **PENDIENTE que Juli los verifique en las fuentes oficiales** (desde el entorno de desarrollo esas páginas están bloqueadas):
  - **0800-444-4000**: Programa de Prevención y Asistencia al Juego Compulsivo (Lotería de la Provincia de Buenos Aires). Gratuita, 24 h, todo el año.
  - **141**: línea nacional gratuita de SEDRONAR para consumos y adicciones.
  Mismo texto en ambas encuestas, sin tono alarmista ("Si vos o alguien cercano quiere hablar sobre esto…"). **No se muestra el puntaje ni un "diagnóstico"** al encuestado: una encuesta no diagnostica.
- **Consentimiento para la encuesta de adolescentes**: hoy la autorización institucional es solo de palabra. PROPUESTA fuerte: conseguir **por escrito** (un email alcanza) la autorización de la dirección de la escuela, y enviar una **nota informativa a las familias**. Es una encuesta a menores sobre un tema sensible: tenerlo por escrito protege a los chicos, a la escuela y a Juli. Es una cuestión institucional, no técnica, y no reemplaza el asesoramiento de la institución.
- **Docentes con acceso al dashboard de adolescentes**: los docentes conocen a sus alumnos, así que en un curso chico edad + género alcanzan para adivinar quién respondió qué, y el comentario libre puede delatar a su autor aunque no tenga el nombre. Por eso (DECIDIDO): el dashboard de docentes muestra **solo datos agregados** y oculta cualquier celda con menos de 5 respuestas; el Excel crudo y los comentarios libres los ve **solo Juli**, que decide qué compartir.
- **La misma regla de menos de 5 vale para el dashboard de adultos** (DECIDIDO): en un cruce como carrera × riesgo PGSI, una carrera chica puede dejar a una sola persona en una celda, y sus compañeros de cursada la reconocerían.
- **«Prefiero no responder» en las preguntas sensibles de adultos** (primera versión; desde el 29/9 esas preguntas ya no están): si apostó en los últimos 12 meses, ingresos, deudas, deuda relativa, monto por apuesta y origen del dinero. Siguen siendo obligatorias (hay que elegir algo), pero obligar sin esa salida empuja a mentir o a abandonar. En las escalas se guarda en una columna aparte (`*_no_responde`), nunca como un número especial dentro de la escala. **El PGSI no la tiene**: es un instrumento validado y su puntaje necesita los 9 ítems. Quien no dice si apostó no ve ninguna de las dos ramas.
- No se guardan direcciones IP en la base ni en logs propios.

## 8. Arquitectura técnica

### 8.1 Frontend
- Diseño trabajado en conjunto en Claude Design (fase propia, ver sección 10). Se exporta como HTML/CSS/JS estático y lo sirve el backend.
- **Dibujado a partir de datos:** el frontend pide la definición a `GET /api/encuestas/:id` (ya implementado) y arma las pantallas con componentes reutilizables. Las condiciones de rama son datos (`visibleSi: { pregunta, es: [...] }`), así que frontend y backend aplican exactamente las mismas reglas.
- Sin recursos externos (tipografías servidas desde el propio servidor, sin analytics): por la anonimidad y para no depender de Google.
- Mobile-first: se entra por QR desde el celular.
- **Una pregunta (o un grupo chico) por pantalla**, con transiciones suaves y barra de progreso. Con bifurcaciones, el total de pasos cambia según la rama: la barra se calcula sobre la rama actual.
- **Sin pase automático (decisión de Juli):** elegir una opción nunca pasa de pantalla; siempre se confirma con «Siguiente». La persona ve lo que eligió y puede corregirlo. «Atrás» lleva marco, para que se lea como botón.
- **Portada de cada parte (solo adolescentes):** número grande, «Parte X de N» y una marca por parte, centrado en el alto de la pantalla. N usa la misma regla que la barra de progreso (una rama sin decidir ya cuenta), así el total nunca crece a mitad de camino. Adultos no la usa (`portadasDeSeccion: false` en su definición) y muestra presentación y consentimiento en una sola pantalla (`inicioConConsentimiento`).
- **Tema de adultos «Pulso» (29/9, `frontend/adultos/tema-c.css`):** reemplaza a «Papel y tinta», que el grupo encontró demasiado formal. Violeta y rosa sobre lavanda clara (sin los colores que el grupo prohibió: rojo con amarillo, verde casino, dorado con negro), tipografías Bricolage Grotesque y Plus Jakarta Sans (OFL, servidas desde el propio servidor), opciones como píldoras que se pintan con un rebote chico al elegirlas, manchas de color que flotan despacio en el fondo y una medalla con tilde al final (sin confeti: no es un premio). Contrastes verificados (texto ≥ 4.5:1). Con «menos movimiento» activado en el celular, todo queda quieto. «Papel y tinta» (`tema-b.css`) sigue existiendo porque lo usa el dashboard.
- **Cada pantalla entra sin deslizar (pedido de Juli):** medido en las 65 pantallas con el alto visible de 4 celulares. En un iPhone 13/14 o más grande entran todas. Para eso: la portada se dividió en presentación y consentimiento; las listas largas sin orden van en dos columnas; en pantallas bajas los tokens se compactan (media queries por alto), sin bajar de 44px los botones ni de 16px el texto. En celulares muy chicos (iPhone SE, Android chico) algunas listas y la pantalla final se pasan un poco: el scroll no se bloquea (lo cortado quedaría inalcanzable) y un degradé sobre el pie avisa que hay más.
- La lógica de bifurcación vive en el frontend para que la experiencia sea fluida. **El backend vuelve a validar todo** antes de guardar.
- Guardado: **un solo envío al final** (`fetch` POST en JSON). PROPUESTA: guardar el progreso en `sessionStorage` para que un refresh accidental no borre lo respondido.

### 8.2 Backend
- **Node.js + Express.**
- Endpoints:
  - `POST /api/respuestas/adultos`, `POST /api/respuestas/adolescentes` — públicos.
  - `POST /api/eventos/:encuesta` — eventos del recorrido (8.7). Público.
  - `POST /api/acceso`, `GET /api/sesion`, `POST /api/salir` — acceso a los resultados.
  - `GET /api/resultados/:encuesta` — datos agregados. **Protegido.**
  - `GET /api/exportar/:encuesta` — Excel. **Protegido.**
- Protección de resultados (IMPLEMENTADO, `backend/acceso.js`): una contraseña por rol en `.env` (`CLAVE_JULI`, `CLAVE_ADULTOS`, `CLAVE_DOCENTES`), nunca en el frontend. Vacía = ese acceso no existe.
  - Al ingresar se abre una sesión de 8 horas: una llave aleatoria en una cookie `HttpOnly` y `SameSite=Strict` (`Secure` con HTTPS). Las sesiones viven en memoria: si el servidor se reinicia, hay que volver a ingresar.
  - Las contraseñas se comparan en tiempo constante. Hay 10 intentos fallidos cada 15 minutos por IP.
  - Adultos: el grupo que encargó el trabajo (dashboard + Excel de resultados).
  - Adolescentes: un grupo de docentes (solo dashboard agregado, ver sección 7).
  - Juli: todo, sin ocultar, con el control de participación y el Excel completo.
- **Anti-abuso** (el POST es público): límite de envíos por IP y por minuto (`express-rate-limit`), límite de tamaño del body, y validación estricta de cada campo (tipo, opciones permitidas, coherencia con la bifurcación).
- **Ventanas de apertura** (PROPUESTA): las fechas (19 al 23/10) y las franjas horarias de cada encuesta se configuran en `.env`. Fuera de esas ventanas, el POST responde "encuesta cerrada" y el frontend muestra cuándo vuelve a abrir. Dashboard y export siguen andando siempre. Así lo que se habilita no depende de acordarse de prender o apagar nada a mano.
- **Fuente única de verdad** (PROPUESTA): la definición de cada encuesta (preguntas, opciones, bifurcaciones) en un archivo propio del backend. De ahí salen la validación, los encabezados del Excel y los datos del dashboard, para no mantener la misma lista de opciones en cuatro lugares distintos.

### 8.3 Base de datos — SQLite (DECIDIDO)

Se reemplaza MySQL/XAMPP por **SQLite**: la base es un solo archivo, no hay servidor que levantar y el backup es copiar ese archivo. Para unos cientos de respuestas sobra.

- Dos tablas independientes: `respuestas_adultos` y `respuestas_adolescentes`.
- SQLite no tiene tipo `BOOLEAN`: se usa `INTEGER` con `CHECK (col IN (0,1))`. Las opciones de respuesta única se guardan como texto con `CHECK (col IN (...))`.
- El `schema.sql` se escribe en la Fase 1 a partir de las secciones 4 y 5, siguiendo las reglas de la sección 3.
- Librería Node: PROPUESTA **`@libsql/client`**. Habla el mismo SQL que SQLite y funciona tanto con un archivo local (`file:encuestas.db`) como con una base SQLite en la nube (Turso). El código no cambia si el hosting cambia (ver 8.5), así que esta decisión no queda atada a la de hosting.

### 8.4 Exportación
1. **Excel** (`exceljs`, IMPLEMENTADO en `backend/resultados/excel.js`), en dos versiones:
   - **De resultados** (grupo y docentes): las mismas tablas del dashboard (Resumen, Preguntas, Cruces), con la regla de anonimato. **Sin filas por persona**: edad exacta + carrera + género alcanzan para reconocer a alguien de una carrera chica, y en esa fila están sus deudas y su riesgo PGSI. Si Juli decide compartir algo crudo, lo decide ella mirando los datos (PROPUESTA: si el grupo lo necesita, darle las respuestas con la edad agrupada y sin la carrera exacta).
   - **Completa** (solo Juli): además, las respuestas crudas (una fila por respuesta, una columna por opción de las múltiples, fecha sin hora, `pgsi_total` y categoría, comentario libre), un diccionario de columnas y la participación.
   - `exceljs` 4.4.0 trae una alerta moderada de `npm audit` en su dependencia `uuid` (GHSA-w5hq-g745-h8pq): afecta a los UUID v3/v5/v6 generados con un buffer propio, algo que este uso no hace. El «arreglo» que propone npm es bajar a exceljs 3.4.0, que es peor.
2. **Dashboard web**: ver 8.6.

### 8.6 Dashboards (DECIDIDO)

> **Adultos desde el 29/9:** sin PGSI. «Hallazgos principales» muestra cuántos apuestan y con qué frecuencia; los cruces comparan «apuesta / no apuesta» según edad, género, carrera, condición laboral, dependencia económica y educación financiera (`backend/resultados/configuracion.js`). Lo que sigue sobre el PGSI describe la primera versión.

- **Un motor, dos configuraciones**, igual que las encuestas. La base se genera sola desde la definición de cada encuesta: cada pregunta de opción o escala es un gráfico de frecuencias. Encima, cada encuesta configura lo que no se deduce solo: cruces y bloques especiales (distribución PGSI).
- **El servidor manda solo números agregados**, nunca filas individuales: aunque alguien abra las herramientas del navegador, las respuestas de una persona no llegan a su computadora.
- **Celdas con menos de 5 respuestas: ocultas** en los dos dashboards (sección 7).
- **Tamaño esperado: entre 70 y 100 respuestas por encuesta** (puede variar). Con ~30% de apostadores, el PGSI tendría **20 a 30 personas**: alcanza para mostrar su distribución, pero casi cualquier cruce del PGSI con otra variable deja celdas de menos de 5. Por eso:
  - Los cruces principales usan **toda la muestra**: «apostó en el último año sí/no» según ingresos, deudas, entorno, publicidad y educación financiera.
  - El PGSI se muestra como distribución, y cruzado solo en 2 grupos (sin riesgo o bajo / moderado o problemático) contra variables de 2 niveles.
  - Los gráficos de una sola pregunta muestran todas las categorías.
  - Cada porcentaje lleva su base (`n = 25`), y en preguntas de rama la base es solo quien vio la pregunta.
- **Lenguaje**: la encuesta se toma una sola vez, así que muestra **asociaciones, no causas**. El dashboard dice «entre quienes tienen deudas, X% está en riesgo moderado o más», nunca «las deudas causan…».
- **Preguntas de investigación propuestas para adultos** (a confirmar con el grupo): panorama (cuántos apostaron, distribución PGSI); situación económica (riesgo según ingresos, deudas y dependientes; origen del dinero); entorno y publicidad (familiares que apuestan, creencia de plata fácil, canales); educación financiera (¿quienes la recibieron apuestan menos o tienen menos riesgo? ¿cuántos quieren recibirla?).
- **Accesos**:
  - Juli: todo, en cualquier momento, incluida una sección de **control** durante la semana: embudo de participación (8.7), entradas y respuestas **por día** (no por franja: la hora no se guarda, por anonimato) y reparto por carrera, para detectar a tiempo si una carrera casi no respondió. Juli ve las cantidades sin ocultar.
  - Grupo de adultos y docentes: el dashboard de su encuesta. Lo reciben **al terminar la semana**, junto con el Excel (adultos).
  - Cada contraseña va en `.env`. **Mientras la de un grupo esté vacía, ese acceso no existe**: se carga recién al cerrar la encuesta, así nadie entra antes aunque tenga el link.
- Gráficos servidos desde el propio servidor (la CSP no permite CDN).
- **Implementado el cálculo** (`backend/resultados/`): distribución de cada pregunta, cruces configurados en `configuracion.js` y embudo. La regla de anonimato incluye **supresión secundaria**: si en una distribución o en una fila o columna de un cruce queda una sola celda oculta, se oculta otra, porque con el total a la vista una sola se despeja restando. `npm run resultados -- adultos` lo muestra en la terminal.
  - En los cruces, la celda extra se elige completando un rectángulo de celdas ocultas, para no arrastrar filas enteras en cadena.
  - Las opciones que abren una rama («Apostó: sí») **no se ocultan de más**: su cantidad ya es pública como base de las preguntas de esa rama. Límite conocido y aceptado: si todas las ramas de una pregunta son públicas, la opción que no abre ninguna («Prefiero no responder») se despeja restando del total. Protegerla obligaría a ocultar secciones enteras, y lo único que revela es que alguien no quiso contestar, sin ningún dato sobre esa persona. (Lo detectó la revisión de Claude Design.)
- **Implementada la página** (`/resultados/`, `frontend/resultados/`) con la dirección **1a «Renglones»** de `design/dashboard/`. Se eligió sobre 1b porque:
  - los renglones horizontales admiten cualquier cantidad de opciones y textos largos (la carrera tiene 9 opciones; en columnas no entran) y se leen bien en el celular;
  - lo oculto se escribe en vez de dibujarse, así nunca insinúa su tamaño;
  - se imprime prolijo.
  - Las pantallas que el handoff dejó sin diseñar (acceso, índice, Control, estados, impresión) siguen el mismo lenguaje.
- **Segunda vuelta visual («más vida», pedido de Juli):** misma paleta y mismos datos, presentación de panel.
  - Barra lateral en tinta con los selectores, el índice (la sección que se lee se enciende al hacer scroll) y las acciones.
  - Indicadores principales en tarjetas con una franja de color; anillos para «apostó» y para el PGSI.
  - Cada sección en su tarjeta, numerada: verde para las preguntas, terracota para los cruces.
  - Descartado de la referencia: gráficos de área y flechas de tendencia (la encuesta es una foto de una semana, no hay serie en el tiempo) y degradés sobre los datos (distorsionan la lectura del tamaño).
  - El anillo del PGSI sigue la misma regla que tenía la barra apilada: solo se dibuja si no hay categorías ocultas.

### 8.7 Eventos del recorrido (DECIDIDO, implementado)

Para saber **cuántos no participaron** y **en qué pantalla se abandona**, en las dos encuestas. Hoy la tabla de respuestas solo tiene a quienes terminaron.

- Tabla `eventos`: `fecha` (sin hora), `encuesta`, `evento` y, si corresponde, `pregunta`. **Sin identificador de sesión, sin hora y sin IP**: los eventos no se pueden unir entre sí ni con una respuesta, solo contar. De solo agregar, como las respuestas.
- Eventos: `entro` (vio la portada), `acepto`, `no_participa`, `edad_fuera` (puso una edad que no corresponde: detecta QR equivocados) y `vio` + pregunta (llegó a esa pantalla).
- Cada evento se manda **una vez por pestaña** (se anota en `sessionStorage`): recargar o volver atrás no cuenta doble.
- **Son aproximados**: quien abre la encuesta en dos celulares cuenta dos veces, y el endpoint es público (se valida que el evento y la pregunta existan, con límite por minuto). Sirven para ver tendencias, no como dato exacto. Fuera de horario no se registran.
- Cómo se lee el abandono: comparar cuántos **vieron** preguntas que ve todo el mundo (las que no tienen `visibleSi`). Entre dos de ellas, la diferencia es la gente que se fue en ese tramo. Adentro de una rama, la caída se compara con quienes vieron la primera pregunta de esa rama.

### 8.5 Servidor y despliegue — DECIDIDO: se prueba la opción B (costo $0)

**Requisitos de Juli:** que sea rápido y fluido, sin problemas de acceso, y que ningún dato se borre, se altere ni se pierda. La luz y el internet de la casa de Juli son estables, así que la opción A queda como respaldo real: el código es el mismo en ambas.

**Cómo se cubre cada requisito en la opción B:**
- *Lentitud por el "sueño" de Render*: un servicio gratuito de monitoreo (por ejemplo, UptimeRobot o cron-job.org) consulta un endpoint liviano `/api/salud` (implementado, no toca la base) cada 10 minutos durante los días de encuesta, y el servidor no llega a dormirse. Verificado en la documentación de Render: 750 horas gratis por mes y por cuenta; encendido todo el mes serían 744 (sin margen). Con el horario de 8 a 22, el despertador avisa **solo de 7:00 a 22:10, del 19 al 23/10** (≈78 horas); de noche el servidor se duerme solo. Si se agotan, el servicio se suspende hasta el mes siguiente.
- *Que nada se altere o borre*: la base es de solo agregar (triggers que bloquean UPDATE y DELETE, ya implementados y probados), con reglas CHECK por columna y ningún endpoint que modifique o borre.
- *Que nada se pierda*: Turso guarda los datos fuera del servidor. `npm run backup` copia la base entera a un archivo SQLite y verifica las filas de cada tabla; se corre cada noche de la semana de encuesta. El servidor se niega a arrancar en Render con una base en archivo local (el disco de Render se borra al dormirse).
- *Que un cambio de pregunta no pierda respuestas*: al arrancar, el servidor compara la definición completa de cada tabla (columnas **y** valores permitidos) con la de las encuestas. Si no coinciden, no arranca. Antes solo comparaba los nombres de columnas, y un cambio de opciones pasaba sin aviso y rechazaba a quien eligiera la opción nueva.
- *Piloto sin ensuciar los datos reales*: dos bases en Turso, `encuestas-piloto` y `encuestas-real`; se cambia de una a otra en las variables de Render antes del 19/10.
- **Guía paso a paso: `docs/DESPLIEGUE.md`**, con la receta de Render en `render.yaml` y los QR estáticos con `npm run qr`.

---

Opciones evaluadas:

Nadie va a pagar el hosting, así que solo entran opciones gratuitas. Hay dos candidatas:

**Opción A — PC de Juli + ngrok (gratis), en franjas horarias**
- A favor: todo queda en la PC de Juli, el control es total y no hay cuentas externas salvo ngrok.
- En contra: el plan gratuito muestra una **página de advertencia de ngrok** la primera vez que alguien entra (después queda recordado 7 días en ese navegador). Si la PC está apagada, el QR muestra un error de ngrok y no un mensaje propio. Un corte de luz o de internet en Chascomús durante una franja deja la encuesta caída.
- Mitigación: avisar en el aula "vas a ver una pantalla de ngrok, tocá *Visit Site*".

**Opción B — Render (gratis) + Turso (gratis)**
- Render aloja el servidor Node con una URL fija `https://….onrender.com` (HTTPS y sin página de advertencia). En el plan gratuito, el disco se borra en cada reinicio: por eso los datos NO pueden vivir ahí.
- Turso guarda la base SQLite en la nube (el plan gratuito sobra: 5 GB y millones de escrituras).
- A favor: no depende de la PC ni de la luz de Juli, y la URL queda fija para imprimir los QR.
- En contra: el servidor gratuito de Render "se duerme" tras 15 minutos sin visitas y tarda cerca de un minuto en despertar. Mitigación: abrir el link unos minutos antes de cada franja. Además, suma dos cuentas externas y los datos (anónimos) quedan en un servicio de terceros.

Con `@libsql/client` (ver 8.3), el código es el mismo en ambas opciones: se puede desarrollar ya y decidir el hosting después. **Decidir antes de imprimir los QR**, porque la URL tiene que quedar fija.

Checklist de cierre (por encuesta): exportar Excel final → backup de la base (copiar el `.db`, o `turso db shell … .dump` en la opción B) → recién ahí apagar.

## 9. Estructura de carpetas

```
Encuesta-Ludopatia/
├── backend/
│   ├── server.js
│   ├── encuestas/           ← definición de preguntas (fuente única de verdad)
│   ├── routes/
│   ├── db/
│   └── middleware/
├── frontend/
│   ├── adultos/
│   └── adolescentes/
├── database/
│   └── schema.sql
├── docs/
│   ├── PLAN-encuesta-ludopatia.md
│   └── fuentes/             ← imágenes y PDF originales de las preguntas
├── .env.example             ← variables sin valores reales
└── .gitignore               ← incluye .env y *.db (los datos NUNCA van a GitHub)
```

## 10. Fases de implementación

1. ✅ **Base de datos**: `database/schema.sql` generado desde las definiciones, con CHECKs y triggers de solo agregar.
2. ✅ **Backend núcleo**: Express, `@libsql/client`, definición de ambas encuestas, `POST /api/respuestas/:encuesta` con validación, límite de envíos, helmet y 32 tests automáticos.
3. ✅ **Diseño** (en conjunto, Claude Design): material listo en `docs/diseno/` (brief, guía con prompts, contrato, contenido generado). DECIDIDO: dos identidades distintas (adolescentes: curiosa y confiable, no divertida; adultos: editorial y detallada) sobre un mismo motor de componentes con dos temas. Sin restricciones de color.
4. ✅ **Frontend**: adolescentes (tema "Noche tranquila") y adultos (tema "Papel y tinta"; desde el 29/9, "Pulso") sobre el mismo motor sin framework, traducido de los prototipos de Claude Design. El motor elige cada componente por la forma de la pregunta (tramos, frecuencia PGSI, opciones agrupadas, nota de ayuda, pantalla info). Ambos probados de punta a punta en Chromium. Quedan textos marcados PROPUESTA para revisar con cada grupo.
5. ✅ **Integración** frontend ↔ backend (ambas encuestas), con ventanas de apertura (`VENTANAS_*`) y pantalla de encuesta cerrada.
6. ✅ **Dashboards** + **exportación Excel** + **autenticación**: cálculo con regla de anonimato, página `/resultados/` con acceso por rol, Control de participación y Excel en dos versiones. Probado de punta a punta en Chromium (escritorio, celular e impresión).
7. **Prueba piloto** con 3-5 personas por encuesta: medir tiempos, detectar preguntas confusas.
8. 🔧 **Despliegue** + generación de los dos QR: preparado (receta de Render, `/api/salud`, backup verificado, QR estáticos, chequeo de esquema completo y guía en `docs/DESPLIEGUE.md`). Falta crear las cuentas y seguir la guía.
9. **Cierre**: backup y apagado.

## 11. Resumen de PENDIENTES

| # | Tema | Quién decide |
|---|------|--------------|
| 1 | Carreras de adultos: ¿«Tecnicatura Enfermería» y «Enfermería» son dos carreras distintas? ¿«ATM» es Acompañante Terapéutico? (sección 4) | Juli / grupo |
| 2 | Crear una base piloto nueva en Turso antes de publicar este cambio (la actual tiene la tabla de adultos vieja: el servidor no arrancaría) — `docs/DESPLIEGUE.md`, paso 1b | Juli |
| 5 | Verificar las líneas de ayuda 0800-444-4000 y 141 | Juli |
| 8 | Autorización escrita de la escuela + nota a familias (adolescentes) | Juli / institución |
| 10 | Elegir las tres contraseñas de resultados (12+ caracteres, distintas) y cargar la del grupo y la de docentes recién al cerrar la encuesta | Juli |
| 11 | Confirmar que el grupo recibe el Excel de resultados (sin filas por persona) y no el crudo (8.4) | Juli |

**Ya decidido:** preguntas de adultos según la lista del grupo más lo que exige la consigna (sección 4, 29/9); tema «Pulso» para adultos; hosting opción B con la A de respaldo; fechas y horario; destinatarios de cada dashboard; entre 70 y 100 respuestas esperadas por encuesta; contador anónimo de no participación y abandonos en ambas (8.7); regla de menos de 5 en ambos dashboards; dashboards entregados al final de la semana con control en vivo solo para Juli. **Descartado el 29/9:** PGSI, ingresos, deudas, salario mínimo de referencia y el texto explicativo de educación financiera.
