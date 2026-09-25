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
- Disponible del **lunes 19 al viernes 23 de octubre de 2026** (ambas encuestas), en **franjas horarias específicas** (PENDIENTE: definir las franjas de cada institución).
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

## 4. Encuesta de ADULTOS (18+)

Preguntas **obligatorias según el grupo** (no se tocan): **edad, género, carrera y el bloque de educación financiera**. El resto viene de las imágenes y se puede ajustar (**PROPUESTA** de ajustes marcada abajo).

```
PANTALLA 0 — Intro + consentimiento (PROPUESTA)
  Texto: anónima, sin respuestas correctas, sin juzgar, < 5 min.
  "¿Aceptás participar?" Sí / No  → No: fin sin guardar nada.
  DECIDIDO: participar es voluntario; lo obligatorio es responder cada pregunta una vez que se aceptó
  (no hay "Prefiero no responder" y no se avanza sin contestar).

BLOQUE 1 — Sobre vos (obligatorio)
  → ¿Qué edad tenés? (número, 18–99)
  → ¿Qué carrera estás cursando? (única)
      DECIDIDO (lista corregida por Juli; la de la imagen estaba mal cargada):
      Educación Inicial
      Profesorado de Inglés / Profesorado de Matemáticas / Profesorado de Literatura
      Tecnicatura en Ciencia de Datos e IA / Tecnicatura en Seguridad e Higiene /
      Tecnicatura en Administración Financiera / Tecnicatura en Acompañante Terapéutico /
      Tecnicatura en Trabajo Social
      UI: agrupadas en tres bloques visuales (Educación Inicial / Profesorados / Tecnicaturas).
  → ¿Con qué género te identificás? (Masculino / Femenino / Otro / Prefiero no decir)
  → ¿En qué condición laboral te encontrás? (Trabajo propio / No trabajo / Trabajo en relación de dependencia)
  → ¿Dependés económicamente de alguien? (Sí / No)
  → ¿Alguien depende económicamente de vos? (Sí / No)
  → Ingresos del HOGAR (DECIDIDO: slider de 5 pasos, pregunta propia)
      "¿Cuánto dinero ingresa por mes en tu hogar, aproximadamente?"
      Paso 1: "Sin ingresos o hasta $A" … Paso 5: "$D o más". Pasos 2-4 = rangos intermedios.
      DECIDIDO: en salarios mínimos (SMVM): hasta 1 / 1-2 / 2-3 / 3-5 / más de 5, mostrando el
      monto en pesos equivalente. (Los cortes en pesos, de $10.000 a $100.000, quedaban por debajo
      del salario mínimo, $383.800 en septiembre de 2026, y casi todos habrían caído en el paso 5.)
  → Deudas (DECIDIDO: separada de ingresos pero complementaria)
      "¿Tenés deudas actualmente?" (Sí / No)
        → si Sí: slider de 5 pasos, en relación al ingreso (DECIDIDO):
          "Menos de medio mes de ingresos" / "Medio mes a 1 mes" / "1 a 3 meses" /
          "3 a 6 meses" / "Más de 6 meses de ingresos".
          Así se compara a una persona que gana poco con una que gana mucho, sin depender de la inflación.
  Reglas de UI para los sliders (PROPUESTA):
    - Arrancan SIN valor seleccionado (sin un punto de partida marcado). Si arrancaran en el medio,
      quien no lo toque quedaría guardado con una respuesta que nunca dio.
    - Muestran el rango en texto mientras se desliza ("Entre $X y $Y").
    - En el backend se guarda el número de paso (1-5), no el texto: es ordinal y fácil de graficar.

BLOQUE 2 — Pregunta gatillo
  Original: "¿Realizás apuestas online?" (Sí / No)
  DECIDIDO: "En los últimos 12 meses, ¿apostaste dinero, ya sea online o de forma presencial?"
    Motivos: (a) después se pregunta por "Casino" presencial, que no es online;
             (b) el PGSI mide los últimos 12 meses, así que el gatillo tiene que usar el mismo período.

  SI SÍ → "Tus hábitos de apuesta"
    → ¿Con qué frecuencia apostás? (ÚNICA — en la imagen dice "múltiple", pero una frecuencia es una sola)
        DECIDIDO (mismas opciones que adolescentes, para poder comparar):
        Menos de una vez al mes / Algunas veces al mes / Una vez por semana /
        Varias veces por semana / Casi todos los días
    → ¿Por qué apostás? (múltiple: Diversión / Ganar dinero / Influencia social / Otra)
    → ¿Qué tipo de apuestas hacés? (múltiple: Casino presencial / Casino online / Apuestas deportivas)
    → ¿Reconocés si apostás en una plataforma legal? (Sí / No)
    → ¿Incluiste a alguien para que se involucre en el mundo de las apuestas? (Sí / No / No sé)
    → ¿Cuánto dinero solés apostar cada vez? (DECIDIDO: rangos, slider de 5 pasos)
        Menos de $10.000 / $10.000–$25.000 / $25.000–$50.000 / $50.000–$100.000 / Más de $100.000

    → ¿De dónde proviene el dinero? (múltiple: Sueldo / Préstamo / Planes sociales / Otro)
        DECIDIDO. "Otro" se agrega porque, como en adultos todo es obligatorio, sin esa opción
        quien no encaje queda forzado a marcar una opción falsa.
    → PGSI — 9 preguntas (ver sección 6)

  SI NO → "Tu mirada sobre las apuestas" (de preguntas 2.jpg)
    → ¿Pensaste alguna vez en hacerlo? (Sí / No)
    → ¿Cuál es el motivo principal por el que no apostás? (única: No me interesa /
        Miedo a perder plata / Miedo a volverme adicto / No sé cómo se hace / Otro)

BLOQUE 3 — Entorno y publicidad (TODOS) — DECIDIDO
  Estas preguntas estaban solo en la rama "no apuesta". Se pasan al bloque común porque,
  para estudiar el rol de la publicidad y del entorno, hay que comparar a los que apuestan
  con los que no. Si solo responde un grupo, esa comparación es imposible.
    → ¿Tenés familiares o amigos cercanos que apuesten regularmente? (Sí / No / No sé)
    → ¿Creés que se puede generar plata fácil apostando? (Sí / No / A veces)
    → ¿Por qué canales ves más publicidad de apuestas? (múltiple: Redes sociales /
        Videojuegos / Streamers y/o influencers / TV / La calle / Ninguno)
        "TV" y "La calle" se suman para poder comparar con adolescentes.

BLOQUE 4 — Educación financiera (obligatorio, exclusivo de adultos)
  DECIDIDO el orden: primero "¿sabés qué es?" y después "¿la recibiste?".
    → ¿Sabés qué es la educación financiera? (Sí / No)
    → ¿Recibiste educación financiera? (Sí / No / No sé)
        → si Sí: ¿Dónde? (múltiple: Casa / Escuela / Internet)
    → ¿Te gustaría recibirla? (Sí / No)
    → Breve explicación de qué es la educación financiera (informativo). PENDIENTE: Claude redacta un borrador y el grupo lo aprueba.

PANTALLA FINAL — Agradecimiento + recursos de ayuda (ver sección 7)
```

**Estimación de tiempo** (rama "sí", la más larga): 9 + 1 + 8 + 9 (PGSI) + 3 + 4 ≈ 34 preguntas, casi todas de un toque. Entra en 5 minutos si cada pantalla es ágil, pero está justo. **Hay que medirlo en una prueba piloto** (sección 11).

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

## 6. Instrumento de riesgo: PGSI (DECIDIDO, solo adultos, rama "sí")

El **Problem Gambling Severity Index** (índice de severidad del juego problemático) es un cuestionario de 9 preguntas validado internacionalmente. Reemplaza a las "escalas de impacto" propias del plan anterior. Con él se puede decir "el X% presenta riesgo moderado" con respaldo metodológico.

Período: **últimos 12 meses**. Cada pregunta: Nunca (0) / A veces (1) / La mayoría de las veces (2) / Casi siempre (3).

1. ¿Apostaste más de lo que realmente podías permitirte perder?
2. ¿Necesitaste apostar cantidades cada vez mayores para sentir la misma emoción?
3. ¿Volviste otro día para intentar recuperar el dinero que habías perdido?
4. ¿Pediste dinero prestado o vendiste algo para conseguir dinero para apostar?
5. ¿Sentiste que podrías tener un problema con el juego?
6. ¿El juego te causó problemas de salud, incluido estrés o ansiedad?
7. ¿Otras personas criticaron tus apuestas o te dijeron que tenías un problema con el juego, más allá de que vos creyeras que era cierto o no?
8. ¿El juego te causó problemas económicos a vos o a tu hogar?
9. ¿Te sentiste culpable por la forma en que apostás o por lo que pasa cuando apostás?

Puntaje total (0–27), que **calcula el backend**, nunca el frontend: 0 = sin riesgo · 1–2 = riesgo bajo · 3–7 = riesgo moderado · 8+ = juego problemático.

**Versión en español (DECIDIDO buscar primero en español):** existe una validación publicada: López-González, Estévez y Griffiths (2018), *Spanish validation of the Problem Gambling Severity Index: A confirmatory factor analysis with sports bettors*, Journal of Behavioral Addictions 7(3). Muestra de 659 apostadores deportivos adultos de España, consistencia interna muy alta (α ordinal = .97). También hay una versión en español que distribuye el Departamento de Salud Mental y Adicciones de Connecticut (DMHAS).

**PENDIENTE**: la redacción de arriba es una traducción de trabajo. Hay que reemplazarla por los ítems textuales del artículo (Juli lo descarga: desde el entorno de desarrollo el sitio de la revista está bloqueado). Como esa validación es de España, se permite adaptar al voseo rioplatense ("apostaste" en vez de "has apostado") sin cambiar el sentido de cada ítem, y dejar documentado el cambio. No hay validación específica para Argentina: es una limitación a mencionar en el informe del grupo.

## 7. Consideraciones éticas

- Ninguna encuesta pide datos identificatorios.
- Copy neutral, sin estigmatizar.
- Consentimiento explícito al inicio de ambas.
- **Pantalla final con recursos de ayuda** (ambas instituciones están en Chascomús, provincia de Buenos Aires). Números encontrados, **PENDIENTE que Juli los verifique en las fuentes oficiales** (desde el entorno de desarrollo esas páginas están bloqueadas):
  - **0800-444-4000**: Programa de Prevención y Asistencia al Juego Compulsivo (Lotería de la Provincia de Buenos Aires). Gratuita, 24 h, todo el año.
  - **141**: línea nacional gratuita de SEDRONAR para consumos y adicciones.
  Mismo texto en ambas encuestas, sin tono alarmista ("Si vos o alguien cercano quiere hablar sobre esto…"). **No se muestra el puntaje ni un "diagnóstico"** al encuestado: una encuesta no diagnostica.
- **Consentimiento para la encuesta de adolescentes**: hoy la autorización institucional es solo de palabra. PROPUESTA fuerte: conseguir **por escrito** (un email alcanza) la autorización de la dirección de la escuela, y enviar una **nota informativa a las familias**. Es una encuesta a menores sobre un tema sensible: tenerlo por escrito protege a los chicos, a la escuela y a Juli. Es una cuestión institucional, no técnica, y no reemplaza el asesoramiento de la institución.
- **Docentes con acceso al dashboard de adolescentes**: los docentes conocen a sus alumnos, así que en un curso chico edad + género alcanzan para adivinar quién respondió qué, y el comentario libre puede delatar a su autor aunque no tenga el nombre. Por eso (PROPUESTA): el dashboard de docentes muestra **solo datos agregados** y oculta cualquier cruce con menos de 5 respuestas; el Excel crudo y los comentarios libres los ve **solo Juli**, que decide qué compartir.
- No se guardan direcciones IP en la base ni en logs propios.

## 8. Arquitectura técnica

### 8.1 Frontend
- Diseño trabajado en conjunto en Claude Design (fase propia, ver sección 10). Se exporta como HTML/CSS/JS estático y lo sirve el backend.
- Mobile-first: se entra por QR desde el celular.
- **Una pregunta (o un grupo chico) por pantalla**, con transiciones suaves y barra de progreso. Con bifurcaciones, el total de pasos cambia según la rama: la barra se calcula sobre la rama actual.
- La lógica de bifurcación vive en el frontend para que la experiencia sea fluida. **El backend vuelve a validar todo** antes de guardar.
- Guardado: **un solo envío al final** (`fetch` POST en JSON). PROPUESTA: guardar el progreso en `sessionStorage` para que un refresh accidental no borre lo respondido.

### 8.2 Backend
- **Node.js + Express.**
- Endpoints:
  - `POST /api/respuestas/adultos`, `POST /api/respuestas/adolescentes` — públicos.
  - `GET /api/dashboard/:encuesta` — datos agregados. **Protegido.**
  - `GET /api/export/:encuesta` — Excel. **Protegido.**
- Protección de dashboard/export: contraseña distinta por encuesta, guardada en `.env` y nunca en el frontend (DECIDIDO):
  - Adultos: el grupo que encargó el trabajo (dashboard + Excel).
  - Adolescentes: un grupo de docentes (solo dashboard agregado, ver sección 7) y Juli (todo).
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
1. **Excel** (`exceljs`): datos crudos, una fila por respuesta, una columna por opción de las preguntas múltiples, fecha sin hora. En adultos se incluye la columna calculada `pgsi_total` y su categoría.
2. **Dashboard web** (una página por encuesta, protegida): gráficos con Chart.js alimentados por los endpoints de agregación. Los porcentajes de preguntas de rama usan como denominador **solo a quienes vieron la pregunta**.

### 8.5 Servidor y despliegue — DECIDIDO: se prueba la opción B (costo $0)

**Requisitos de Juli:** que sea rápido y fluido, sin problemas de acceso, y que ningún dato se borre, se altere ni se pierda. La luz y el internet de la casa de Juli son estables, así que la opción A queda como respaldo real: el código es el mismo en ambas.

**Cómo se cubre cada requisito en la opción B:**
- *Lentitud por el "sueño" de Render*: un servicio gratuito de monitoreo (por ejemplo, UptimeRobot o cron-job.org) consulta un endpoint liviano `/api/salud` cada 10 minutos durante los días de encuesta, y el servidor no llega a dormirse. Encendido las 24 h, un servicio consume unas 744 h por mes, dentro de las 750 h gratuitas. PENDIENTE verificar en la fase de despliegue que las condiciones de Render lo permitan. Si no, se pasa a la opción A.
- *Que nada se altere o borre*: la base es de solo agregar (triggers que bloquean UPDATE y DELETE, ya implementados y probados), con reglas CHECK por columna y ningún endpoint que modifique o borre.
- *Que nada se pierda*: Turso guarda los datos fuera del servidor. Además, un script de backup descarga una copia completa cada noche durante la semana de encuesta (fase de despliegue).

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
3. **Diseño** (en conjunto, Claude Design): identidad visual, componentes (pregunta única, múltiple, escala, número), transiciones, pantalla final.
4. **Frontend**: implementación del diseño con la lógica de bifurcación.
5. **Integración** frontend ↔ backend.
6. **Dashboards** + **exportación Excel** + **autenticación**.
7. **Prueba piloto** con 3-5 personas por encuesta: medir tiempos, detectar preguntas confusas.
8. **Despliegue** + generación de los dos QR.
9. **Cierre**: backup y apagado.

## 11. Resumen de PENDIENTES

| # | Tema | Quién decide |
|---|------|--------------|
| 1 | Valor del salario mínimo de octubre de 2026 (constante `SMVM_REFERENCIA` en `backend/encuestas/adultos.js`) | Juli |
| 3 | Texto de la explicación de educación financiera (Claude redacta un borrador, el grupo aprueba) | Grupo |
| 4 | Ítems textuales del PGSI en español (artículo de 2018) | Juli |
| 5 | Verificar las líneas de ayuda 0800-444-4000 y 141 | Juli |
| 6 | Franjas horarias de cada institución (19 al 23/10) | Juli |
| 8 | Autorización escrita de la escuela + nota a familias (adolescentes) | Juli / institución |

**Ya decidido:** ingresos medidos en salarios mínimos; cortes del monto apostado ($10k / 25k / 50k / 100k); hosting opción B con la A de respaldo; respuestas obligatorias en adultos, ingreso del hogar, deuda relativa al ingreso, nuevo gatillo de 12 meses, frecuencia como respuesta única, entorno y publicidad en el bloque común (con TV y calle), "Otro" en origen del dinero, "Prefiero no decir" en género, lista corregida de carreras, PGSI en español, fechas, destinatarios de cada dashboard.
