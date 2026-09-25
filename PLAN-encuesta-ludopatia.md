# Plan Técnico — Encuestas sobre Ludopatía (Adultos 18+ y Adolescentes 12-17)

> Documento de referencia para el desarrollo. Contiene el contexto, la arquitectura y las decisiones tomadas hasta ahora.
>
> - **DECIDIDO**: confirmado por Juli, se puede codear.
> - **PROPUESTA**: recomendación técnica, falta confirmación (de Juli o del grupo de adultos).
> - **PENDIENTE**: falta información; no codear esa parte hasta cerrarla.
>
> Fuentes de las preguntas (en la raíz del repo):
> - Adultos: `WhatsApp Image 2026-09-22 at 20.23.20(1).jpeg` (datos personales, hábitos, educación financiera) y `preguntas 2.jpg` (rama "no apuesta").
> - Adolescentes: `Estructura del Formulario - ¿Cuándo el juego deja de ser un juego_.pdf`.

---

## 1. Contexto

Dos encuestas sobre ludopatía, para dos públicos y **dos instituciones distintas**, construidas sobre el mismo sistema propio (sin Google Forms/Sheets):

- **Encuesta de adultos (18+)**: encargada por un grupo de estudiantes de Administración Financiera de un instituto, dirigida a adultos que cursan en esa institución. Busca detectar perfiles de riesgo de ludopatía y entender qué factores contextuales los empujan a apostar. **Para los adultos las respuestas son obligatorias.**
- **Encuesta de adolescentes (12-17)**: proyecto propio de Juli, hasta ahora en Google Forms, que se migra a este sistema. **Para los menores las respuestas no son obligatorias** (se mantiene "Prefiero no responder" y preguntas que se pueden saltear).

**Restricciones comunes:**
- No usar Google Forms / Sheets / Looker Studio.
- Página web propia, alojada de forma provisoria.
- Disponible durante **7 días**. **PENDIENTE**: confirmar si el plazo es igual para ambas encuestas.
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
      Inicial / Inglés / CUFA Curso de Formación Básica / Matemáticas /
      Profesorado Literatura / Tecnicatura Enfermería / Trabajo Social /
      Seguridad e Higiene / Ciencia de Datos e Inteligencia Artificial /
      Adm. Financiera / Enfermería / ATM
      PENDIENTE: en la imagen dicen "PROFESORADO LITERATURA SOLO" y "SEGURIDAD E HIGIENE SOLO";
      confirmar si "SOLO" es parte del nombre o una aclaración interna.
  → ¿Con qué género te identificás? (Masculino / Femenino / Otro)
  → ¿En qué condición laboral te encontrás? (Trabajo propio / No trabajo / Trabajo en relación de dependencia)
  → ¿Dependés económicamente de alguien? (Sí / No)
  → ¿Alguien depende económicamente de vos? (Sí / No)
  → Ingresos (DECIDIDO: slider de 5 pasos, pregunta propia)
      "¿Cuánto dinero te ingresa por mes, aproximadamente?"
      Paso 1: "Sin ingresos o hasta $A" … Paso 5: "$D o más". Pasos 2-4 = rangos intermedios.
      PENDIENTE: montos A-D (los define el grupo; conviene revisarlos la semana del lanzamiento por inflación).
      PENDIENTE: ¿ingreso personal o del hogar? (miden cosas distintas).
  → Deudas (DECIDIDO: separada de ingresos pero complementaria)
      "¿Tenés deudas actualmente?" (Sí / No)
        → si Sí: slider de 5 pasos. PROPUESTA: medir la deuda en relación al ingreso
          ("Menos de medio mes de ingresos" … "Más de 6 meses de ingresos") en vez de en pesos.
          Así se compara a una persona que gana poco con una que gana mucho y no depende de la inflación.
  Reglas de UI para los sliders (PROPUESTA):
    - Arrancan SIN valor seleccionado (sin un punto de partida marcado). Si arrancaran en el medio,
      quien no lo toque quedaría guardado con una respuesta que nunca dio.
    - Muestran el rango en texto mientras se desliza ("Entre $X y $Y").
    - En el backend se guarda el número de paso (1-5), no el texto: es ordinal y fácil de graficar.

BLOQUE 2 — Pregunta gatillo
  Original: "¿Realizás apuestas online?" (Sí / No)
  PROPUESTA: "En los últimos 12 meses, ¿apostaste dinero, ya sea online o de forma presencial?"
    Motivos: (a) después se pregunta por "Casino" presencial, que no es online;
             (b) el PGSI mide los últimos 12 meses, así que el gatillo tiene que usar el mismo período.

  SI SÍ → "Tus hábitos de apuesta"
    → ¿Con qué frecuencia apostás? (ÚNICA — en la imagen dice "múltiple", pero una frecuencia es una sola)
        PROPUESTA de opciones (mismas que adolescentes, para poder comparar):
        Menos de una vez al mes / Algunas veces al mes / Una vez por semana /
        Varias veces por semana / Casi todos los días
    → ¿Por qué apostás? (múltiple: Diversión / Ganar dinero / Influencia social / Otra)
    → ¿Qué tipo de apuestas hacés? (múltiple: Casino presencial / Casino online / Apuestas deportivas)
    → ¿Reconocés si apostás en una plataforma legal? (Sí / No)
    → ¿Incluiste a alguien para que se involucre en el mundo de las apuestas? (Sí / No / No sé)
    → ¿Cuánto dinero solés apostar cada vez? PROPUESTA: rangos en lugar de número libre
        (un número libre trae valores absurdos y es difícil de agrupar). PENDIENTE: definir rangos en $.
    → ¿De dónde proviene el dinero? (múltiple: Sueldo / Préstamo / Planes sociales)
        DECIDIDO: la lista del grupo son esas tres opciones ("planes" = planes sociales).
        PROPUESTA: sumar "Otro" (ahorros, ayuda familiar, changas…). Como en adultos todo es obligatorio,
        sin "Otro" quien no encaje queda forzado a marcar una opción falsa.
    → PGSI — 9 preguntas (ver sección 6)

  SI NO → "Tu mirada sobre las apuestas" (de preguntas 2.jpg)
    → ¿Pensaste alguna vez en hacerlo? (Sí / No)
    → ¿Cuál es el motivo principal por el que no apostás? (única: No me interesa /
        Miedo a perder plata / Miedo a volverme adicto / No sé cómo se hace / Otro)

BLOQUE 3 — Entorno y publicidad (TODOS) — PROPUESTA
  Estas preguntas estaban solo en la rama "no apuesta". Se pasan al bloque común porque,
  para estudiar el rol de la publicidad y del entorno, hay que comparar a los que apuestan
  con los que no. Si solo responde un grupo, esa comparación es imposible.
    → ¿Tenés familiares o amigos cercanos que apuesten regularmente? (Sí / No / No sé)
    → ¿Creés que se puede generar plata fácil apostando? (Sí / No / A veces)
    → ¿Por qué canales ves más publicidad de apuestas? (múltiple: Redes sociales /
        Videojuegos / Streamers y/o influencers / Ninguno)
        PROPUESTA: sumar "TV" y "La calle", como en adolescentes, para poder comparar.

BLOQUE 4 — Educación financiera (obligatorio, exclusivo de adultos)
  PROPUESTA de orden: primero "¿sabés qué es?" y después "¿la recibiste?".
    → ¿Sabés qué es la educación financiera? (Sí / No)
    → ¿Recibiste educación financiera? (Sí / No / No sé)
        → si Sí: ¿Dónde? (múltiple: Casa / Escuela / Internet)
    → ¿Te gustaría recibirla? (Sí / No)
    → Breve explicación de qué es la educación financiera (informativo). PENDIENTE: texto del grupo.

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

**PENDIENTE verificar**: la redacción de arriba es una traducción de trabajo. Conviene usar una versión en español validada (hay adaptaciones publicadas) y que el grupo o su docente la apruebe.

## 7. Consideraciones éticas

- Ninguna encuesta pide datos identificatorios.
- Copy neutral, sin estigmatizar.
- Consentimiento explícito al inicio de ambas.
- **Pantalla final con recursos de ayuda** (línea de juego responsable / atención en adicciones de la jurisdicción). **PENDIENTE**: Juli verifica los números oficiales vigentes de su provincia. Especialmente importante en la de adolescentes y para quienes tengan PGSI alto. **No se muestra el puntaje ni un "diagnóstico"** al encuestado: una encuesta no diagnostica.
- La encuesta de adolescentes involucra menores en un tema sensible. Confirmar que el consentimiento institucional sigue vigente al cambiar de plataforma (cuestión institucional, no técnica).
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
- Protección de dashboard/export: contraseña distinta por encuesta (el grupo de adultos no ve la de adolescentes y viceversa), guardada en `.env` y nunca en el frontend.
- **Anti-abuso** (el POST es público): límite de envíos por IP y por minuto (`express-rate-limit`), límite de tamaño del body, y validación estricta de cada campo (tipo, opciones permitidas, coherencia con la bifurcación).
- **Cierre automático** (PROPUESTA): fecha y hora de cierre en `.env`. Pasada esa fecha el POST responde "encuesta cerrada" y el frontend lo muestra, pero dashboard y export siguen andando.
- **Fuente única de verdad** (PROPUESTA): la definición de cada encuesta (preguntas, opciones, bifurcaciones) en un archivo propio del backend. De ahí salen la validación, los encabezados del Excel y los datos del dashboard, para no mantener la misma lista de opciones en cuatro lugares distintos.

### 8.3 Base de datos — SQLite (DECIDIDO)

Se reemplaza MySQL/XAMPP por **SQLite**: la base es un solo archivo, no hay servidor que levantar y el backup es copiar ese archivo. Para unos cientos de respuestas sobra.

- Dos tablas independientes: `respuestas_adultos` y `respuestas_adolescentes`.
- SQLite no tiene tipo `BOOLEAN`: se usa `INTEGER` con `CHECK (col IN (0,1))`. Las opciones de respuesta única se guardan como texto con `CHECK (col IN (...))`.
- El `schema.sql` se escribe en la Fase 1 a partir de las secciones 4 y 5, siguiendo las reglas de la sección 3.
- Librería Node: **PENDIENTE** decidir en Fase 2 (`better-sqlite3`, estable y muy usada, contra el módulo `node:sqlite` integrado en Node, que todavía es experimental).

### 8.4 Exportación
1. **Excel** (`exceljs`): datos crudos, una fila por respuesta, una columna por opción de las preguntas múltiples, fecha sin hora. En adultos se incluye la columna calculada `pgsi_total` y su categoría.
2. **Dashboard web** (una página por encuesta, protegida): gráficos con Chart.js alimentados por los endpoints de agregación. Los porcentajes de preguntas de rama usan como denominador **solo a quienes vieron la pregunta**.

### 8.5 Servidor y despliegue — PENDIENTE decidir

La idea original era la PC de Juli + ngrok. Riesgos detectados:
- El **plan gratuito de ngrok muestra una página de advertencia** antes de entrar al sitio, y eso asusta a quien escanea el QR. Además tiene tope de tráfico mensual.
- La PC tiene que estar prendida, sin suspenderse y con internet los 7 días seguidos.

Alternativas a evaluar: ngrok pago por un mes (sin advertencia), Cloudflare Tunnel (gratis, pero la URL fija requiere dominio propio) o un hosting con disco persistente. **Decidir antes de imprimir los QR**, porque la URL tiene que quedar fija.

Checklist de cierre (por encuesta): exportar Excel final → copiar el archivo `.db` como backup → recién ahí apagar.

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

1. **Base de datos**: `schema.sql` con ambas tablas + script para crear la base.
2. **Backend núcleo**: Express, conexión SQLite, definición de encuestas, endpoints de guardado con validación y tests automáticos de cada rama.
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
| 1 | ~~Opción "No participar" en adultos~~ → DECIDIDO: sí, lo obligatorio es responder cada pregunta | — |
| 2 | Ingresos/deudas: montos de los 5 pasos, ingreso personal u hogar, deuda en pesos o relativa | Grupo |
| 3 | Aceptar el nuevo gatillo "últimos 12 meses, online o presencial" | Grupo |
| 4 | Rangos de monto apostado | Grupo |
| 5 | ~~Lista de "origen del dinero"~~ → Sueldo / Préstamo / Planes sociales. Falta confirmar si se suma "Otro" | Grupo |
| 6 | Nombres exactos de carreras ("SOLO") | Grupo |
| 7 | Pasar entorno/publicidad al bloque común; sumar TV y calle | Grupo |
| 8 | Texto de la explicación de educación financiera | Grupo |
| 9 | Versión validada en español del PGSI | Juli / grupo |
| 10 | Números de ayuda oficiales para la pantalla final | Juli |
| 11 | Plazo de 7 días: ¿igual para ambas? | Juli |
| 12 | Hosting / túnel definitivo | Juli |
