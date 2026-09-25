# Plan Técnico — Encuestas sobre Ludopatía (Adultos 18+ y Adolescentes 12-17)

> Documento de referencia para el desarrollo con Claude Code. Contiene el contexto, la arquitectura y las decisiones tomadas hasta ahora. Las secciones marcadas como **PENDIENTE** requieren confirmación antes de codear esa parte. Las marcadas como **PROPUESTA** son decisiones que tomé por mi cuenta como recomendación — Juli las puede confirmar o cambiar.

---

## 1. Contexto

Dos encuestas sobre ludopatía, para dos públicos distintos, que se van a construir sobre el mismo sistema propio (sin Google Forms/Sheets):

- **Encuesta de adultos**: encargada por un grupo de estudiantes de Administración Financiera de un instituto, dirigida a adultos (18 años en adelante, sin límite superior) que cursan en la institución. Busca detectar perfiles de riesgo de ludopatía y entender qué factores contextuales los empujan a apostar.
- **Encuesta de adolescentes** (12-17 años): proyecto propio de Juli, hasta ahora en Google Forms, que se migra a este mismo sistema para dejar de depender del ecosistema Google.

**Restricciones comunes a ambas:**
- No usar Google Forms / Sheets / Looker Studio.
- Página web propia, alojada de forma provisoria.
- Disponible durante **7 días exactos**; después el servidor se apaga. **PENDIENTE**: confirmar si este plazo aplica igual a ambas encuestas o si la de adolescentes tiene más margen.
- Acceso a resultados (Excel + dashboard) restringido solo a quien corresponda en cada caso.
- Duración máxima de respuesta: **menos de 5 minutos**.
- Experiencia dinámica, no monótona.
- Anónimas: sin nombre, DNI ni email.
- Copy neutral, sin alusiones estigmatizantes hacia quienes apuestan.

**Objetivo de investigación — encuesta de adultos:**
- Cuántos adultos del instituto apostaron alguna vez o tienen problemas de ludopatía.
- Relación entre contexto económico/laboral (desempleo, bajos ingresos, deudas, mala educación financiera) y la probabilidad de apostar.
- Rangos etarios con mayor incidencia.
- Rol de la publicidad y el acceso online como facilitadores.
- **No** buscan comparar entre carreras (el dato se recolecta igual, pero no es eje de análisis).

**Objetivo de investigación — encuesta de adolescentes:**
- Prevalencia de apuestas (incluyendo apuestas "en especie", como skins de videojuegos) entre adolescentes.
- Exposición a publicidad y su relación con la percepción de que apostar es normal/inofensivo.
- Percepción social: por qué creen que sus pares apuestan, si creen que se puede "ganar plata" apostando.

## 2. Alcance de este documento

Cubre el diseño completo de **ambas** encuestas sobre el mismo sistema (mismo backend, misma lógica de exportación, bases de datos separadas por tabla).

**Regla de enrutamiento por edad (PROPUESTA):** al entrar, la primera pregunta del sistema es la edad. Si es **menor a 18 → flujo de adolescentes**; si es **18 o más → flujo de adultos**. Esto evita la superposición que existe en los formularios originales (el de adolescentes permite cargar "18" como edad válida). Confirmar si este corte está bien o si el grupo de adultos quiere manejarlo distinto.

Como la edad ya se pregunta una sola vez al entrar (para decidir el enrutamiento), **no se vuelve a preguntar dentro de cada encuesta** — se reutiliza ese mismo dato como el campo `edad` de la tabla correspondiente. Esto evita una pregunta redundante que rompería la promesa de "menos de 5 minutos".

## 3. Decisión de diseño: preguntas de respuesta múltiple (checkboxes)

Varias preguntas (sobre todo en la encuesta de adolescentes) permiten marcar más de una opción a la vez (ej. "¿En qué apostaste?", "¿Dónde ves más publicidad?"). Hay tres formas de guardar esto en la base de datos:

1. **Texto plano con las opciones separadas por coma** dentro de una sola columna. Rápido de programar, pero difícil de analizar después (hay que buscar texto dentro de texto para contar cuántos marcaron una opción).
2. **Tabla normalizada** (una fila por cada opción marcada, con una clave foránea a la respuesta). Es la forma "correcta" en teoría relacional, pero exige un `JOIN` para reconstruir la respuesta y una vuelta extra de lógica en el backend (un insert por cada opción marcada).
3. **Una columna booleana por cada opción posible** (ej. `aposto_casino_online`, `aposto_skins`, todas `TRUE`/`FALSE`). Son más columnas, pero cada una se lee y se cuenta sola con un simple `SUM()`, y al exportar a Excel el resultado es exactamente una columna por opción con 1 y 0 — el formato más directo para armar una tabla dinámica después.

**Decisión: se usa la opción 3 (columnas booleanas)** en todas las preguntas de checkbox de ambas encuestas, por ser la que menos fricción da tanto en el código como en el análisis posterior, dado el tamaño chico del dataset esperado (unos cientos de respuestas).

**PENDIENTE confirmar con Juli:** en la encuesta de adultos, la pregunta "¿Qué tipo de apuestas haces? (Casino, Casino online, Apuestas deportivas)" fue tratada como respuesta múltiple (columnas booleanas) por consistencia con este criterio. Si en realidad era de una sola opción, avisar para volver a una sola columna `tipo_apuesta`.

## 4. Estructura de la encuesta — ADULTOS (18+)

```
PANTALLA DE ENTRADA (todo el sistema)
  → ¿Qué edad tenés? → si ≥18, continúa acá

PANTALLA DE CONSENTIMIENTO (PROPUESTA, ver sección 6)
  → Intro + "¿Aceptás participar?" (Sí/No). Si No, fin sin guardar nada.

BLOQUE 1 — Obligatorio para todos
  → Sexo
  → Carrera
  → Situación laboral / económica (trabajo propio, no trabajo, trabajo en dependencia)
  → Depende económicamente de alguien (sí/no)
  → Alguien depende económicamente de él/ella (sí/no)

BLOQUE 2 — Bifurcación
  Pregunta gatillo: "¿Apostaste alguna vez?"

  SI SÍ → Sección "Experiencia con apuestas"
    → Frecuencia de apuestas (diaria / semanal / mensual)
    → Motivo (diversión, ganar dinero, influencia social, otra) — múltiple
    → Tipo de apuesta (casino, casino online, apuestas deportivas) — múltiple, ver sección 3
    → ¿La plataforma es legal? (sí/no/no sabe)
    → Cuánto dinero apostó/perdió
    → Origen del dinero (sueldo, préstamo, planes, otro)
    → Cómo accedió (complementaria, no obligatoria)
    → Escalas sobre impacto y control (PENDIENTE, ver sección 5)

  SI NO → Sección "Entorno y exposición"
    → ¿Conoce a alguien que apuesta?
    → Con qué frecuencia ve publicidad de apuestas
    → Dónde ve más publicidad — múltiple

BLOQUE 3 — Convergencia (todos)
  → Exposición a publicidad y acceso online a las apuestas

BLOQUE 4 — Educación financiera (todos, sección corta, EXCLUSIVA de esta encuesta)
  → ¿Recibiste educación financiera? (sí/no/no sé, ¿dónde? casa/escuela/internet)
  → ¿Entendés cómo gestionar tu dinero?
  → ¿Estarías dispuesto a recibir asesoramiento?
  → Breve explicación teórica de qué es la educación financiera (informativo, no pregunta)
```

## 5. Estructura de la encuesta — ADOLESCENTES (12-17)

Basado en el formulario "¿Cuándo el juego deja de ser un juego?" que Juli ya tenía armado en Google Forms — se migra tal cual, sin agregar ni quitar preguntas por ahora.

```
PANTALLA DE ENTRADA (todo el sistema)
  → ¿Qué edad tenés? → si <18, continúa acá

SECCIÓN 1 — Introducción y consentimiento
  → Intro: encuesta sobre juego y apuestas online, anónima, sin juzgar, <5 min.
  → "¿Te animás a participar?" (Sí/No). Si No, fin sin guardar nada.

SECCIÓN 2 — Sobre vos
  → Género (Varón / Mujer / Otro / Prefiero no decir)
  → "¿Alguna vez apostaste plata o algo que vale plata (ej. skins)?" — GATILLO, 4 opciones:
      "Sí, pero no en el último año" / "Sí, en el último año" / "Nunca" / "Prefiero no responder"

  BIFURCACIÓN según esa respuesta:
    → {"Sí, pero no en el último año", "Sí, en el último año"} → va a Sección 3
    → {"Nunca", "Prefiero no responder"} → salta directo a Sección 4

SECCIÓN 3 — Tu experiencia con las apuestas (solo rama "sí")
  → ¿En qué apostaste? — múltiple (deportivas online, casino online, cartas, quiniela/lotería, skins, otro, prefiero no responder)
  → Frecuencia en el último año (única)
  → ¿Qué te llevó a apostar? — múltiple (diversión, publicidad/influencers, curiosidad, ganar plata, aburrimiento, amigos/familia, otro, prefiero no responder)
  → ¿Cómo accediste? (con mi cuenta / cuenta de otra persona / en persona / prefiero no responder)

SECCIÓN 4 — Tu entorno y tu opinión (TODOS — convergencia)
  → ¿Conocés a alguien de tu entorno que apueste? (no / sí una persona / sí varias / prefiero no responder)
  → Frecuencia con que ve publicidad de apuestas
  → ¿Dónde ves más publicidad? — múltiple (redes sociales, streamers/influencers, TV, videojuegos, la calle, no veo publicidad)
  → Escala 1-5: "Es fácil perder el control con las apuestas online"
  → Escala 1-5: "Apostar online es un pasatiempo inofensivo"
  → "¿Por qué creés que apuestan las personas de tu edad?" — múltiple (percepción social, distinta de la pregunta 7 que es personal)
  → Escala 1-5: "Alguien de mi edad puede ganar plata apostando"

SECCIÓN 5 — Espacio abierto (opcional)
  → Comentario libre de texto, sin nombres ni datos identificatorios.
```

## 6. Pantalla de consentimiento para adultos (PROPUESTA)

La encuesta de adolescentes ya trae una intro + pregunta de consentimiento explícita antes de pedir cualquier dato. La de adultos no la tenía definida. Propongo agregar el mismo patrón, adaptando el texto de la intro de adolescentes (quitando referencias específicas a la edad): explicar que es anónima, que no hay respuestas correctas, que se puede abandonar en cualquier momento, y pedir honestidad. Si responde "No" a "¿Aceptás participar?", no se guarda ningún registro — se corta ahí, igual que en la de adolescentes.

## 7. Preguntas y decisiones PENDIENTES de confirmar con el grupo (solo encuesta de ADULTOS)

La encuesta de adolescentes ya está completamente definida (viene del Forms existente). Lo que falta cerrar es específico de adultos:

- Redacción exacta de las preguntas de contexto económico (ingresos aproximados, si tiene deudas).
- Redacción y escala exacta de las preguntas de impacto/riesgo en la rama "sí apostó" (impacto relacional, impacto laboral, intentos de dejar, ocultamiento, apuesta para recuperar pérdidas).
- Si "cuánto dinero apostó/perdió" se pide como número libre o como rangos.
- Texto final de la explicación breve sobre educación financiera (Bloque 4).
- Confirmar si "tipo de apuesta" es de respuesta múltiple (ver sección 3).

## 8. Arquitectura técnica

### 8.1 Frontend
- Construido en Claude Design, exportado como HTML/CSS/JS estático.
- Archivos estáticos servidos por el backend (carpeta `frontend/` o `public/`).
- Mobile-first: se accede principalmente desde el celular vía QR.
- La pantalla de entrada (edad) decide qué flujo cargar; la lógica de bifurcación interna de cada encuesta vive en el frontend para que la experiencia sea fluida, pero el backend vuelve a validar la coherencia antes de guardar (nunca confiar solo en el cliente).
- Comunicación con el backend vía `fetch()` a endpoints REST, formato JSON.
- Barra de progreso visible.

### 8.2 Backend
- **Node.js + Express.**
- Endpoints principales:
  - `POST /api/respuestas/adultos` — guarda una respuesta completa de la encuesta de adultos.
  - `POST /api/respuestas/adolescentes` — guarda una respuesta completa de la encuesta de adolescentes.
  - `GET /api/dashboard/adultos` y `GET /api/dashboard/adolescentes` — datos agregados para cada dashboard. **Protegidos.**
  - `GET /api/export/adultos` y `GET /api/export/adolescentes` — generan y descargan el Excel correspondiente. **Protegidos.**
- Protección de `/dashboard` y `/export`: contraseña compartida simple (no hace falta sistema de usuarios completo dado el uso acotado en el tiempo).
- Paquetes clave: `express`, `mysql2`, `exceljs`, `dotenv`, middleware de auth básico.

### 8.3 Base de datos

MySQL vía XAMPP. Dos tablas independientes (no una tabla única con columnas en NULL para la mitad de los casos).

```sql
-- ============================
-- ENCUESTA DE ADULTOS (18+)
-- ============================
CREATE TABLE respuestas_adultos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Bloque 1 (obligatorio)
  edad INT NOT NULL,
  sexo VARCHAR(20) NOT NULL,
  carrera VARCHAR(100) NOT NULL,
  situacion_laboral VARCHAR(30) NOT NULL,
  depende_economicamente BOOLEAN,
  alguien_depende_de_el BOOLEAN,
  -- ingresos_aprox / tiene_deudas: PENDIENTE definir preguntas exactas

  -- Bloque 2 (gatillo)
  aposto_alguna_vez BOOLEAN NOT NULL,

  -- Rama SI (nullable)
  frecuencia_apuestas VARCHAR(20),
  -- motivo_apuesta (múltiple, columnas booleanas):
  motivo_diversion BOOLEAN DEFAULT FALSE,
  motivo_ganar_dinero BOOLEAN DEFAULT FALSE,
  motivo_influencia_social BOOLEAN DEFAULT FALSE,
  motivo_otro BOOLEAN DEFAULT FALSE,
  -- tipo_apuesta (múltiple, columnas booleanas — PENDIENTE confirmar si era múltiple):
  tipo_casino BOOLEAN DEFAULT FALSE,
  tipo_casino_online BOOLEAN DEFAULT FALSE,
  tipo_apuestas_deportivas BOOLEAN DEFAULT FALSE,
  plataforma_legal VARCHAR(10),
  monto_apostado DECIMAL(10,2),
  origen_del_dinero VARCHAR(50),
  como_accedio VARCHAR(100),
  escala_impacto_relacional TINYINT,    -- PENDIENTE definir escala
  escala_impacto_laboral TINYINT,       -- PENDIENTE
  escala_intentos_dejar TINYINT,        -- PENDIENTE
  escala_ocultamiento TINYINT,          -- PENDIENTE
  escala_recuperacion_perdidas TINYINT, -- PENDIENTE

  -- Rama NO (nullable)
  conoce_alguien_que_apuesta VARCHAR(10),
  frecuencia_publicidad_percibida VARCHAR(20),
  -- donde_ve_publicidad (múltiple, columnas booleanas):
  publicidad_redes_sociales BOOLEAN DEFAULT FALSE,
  publicidad_streamers BOOLEAN DEFAULT FALSE,
  publicidad_tv BOOLEAN DEFAULT FALSE,
  publicidad_videojuegos BOOLEAN DEFAULT FALSE,
  publicidad_calle BOOLEAN DEFAULT FALSE,

  -- Bloque 3 (convergencia, todos)
  exposicion_publicidad_online VARCHAR(50), -- PENDIENTE preguntas exactas

  -- Bloque 4 (educación financiera, todos — exclusiva de adultos)
  recibio_educacion_financiera VARCHAR(10),
  donde_recibio_educacion VARCHAR(50),
  entiende_gestion_dinero VARCHAR(10),
  dispuesto_asesoramiento VARCHAR(10)
);

-- ================================
-- ENCUESTA DE ADOLESCENTES (12-17)
-- ================================
CREATE TABLE respuestas_adolescentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Sección 2
  edad INT NOT NULL,
  genero VARCHAR(20) NOT NULL,
  aposto_alguna_vez VARCHAR(30) NOT NULL, -- 'si_no_ultimo_anio' | 'si_ultimo_anio' | 'nunca' | 'prefiero_no_responder'

  -- Sección 3 (nullable, solo rama "sí")
  -- en_que_aposto (múltiple, columnas booleanas):
  aposto_deportivas_online BOOLEAN DEFAULT FALSE,
  aposto_casino_online BOOLEAN DEFAULT FALSE,
  aposto_cartas BOOLEAN DEFAULT FALSE,
  aposto_quiniela_loteria BOOLEAN DEFAULT FALSE,
  aposto_skins BOOLEAN DEFAULT FALSE,
  aposto_otro BOOLEAN DEFAULT FALSE,
  frecuencia_ultimo_anio VARCHAR(30),
  -- que_lo_llevo_a_apostar (múltiple, columnas booleanas):
  motivo_diversion BOOLEAN DEFAULT FALSE,
  motivo_publicidad_influencers BOOLEAN DEFAULT FALSE,
  motivo_curiosidad BOOLEAN DEFAULT FALSE,
  motivo_ganar_plata BOOLEAN DEFAULT FALSE,
  motivo_aburrimiento BOOLEAN DEFAULT FALSE,
  motivo_amigos_familia BOOLEAN DEFAULT FALSE,
  motivo_otro BOOLEAN DEFAULT FALSE,
  como_accedio VARCHAR(30),

  -- Sección 4 (todos)
  conoce_alguien_que_apuesta VARCHAR(30),
  frecuencia_publicidad VARCHAR(30),
  -- donde_ve_publicidad (múltiple, columnas booleanas):
  publicidad_redes_sociales BOOLEAN DEFAULT FALSE,
  publicidad_streamers BOOLEAN DEFAULT FALSE,
  publicidad_tv BOOLEAN DEFAULT FALSE,
  publicidad_videojuegos BOOLEAN DEFAULT FALSE,
  publicidad_calle BOOLEAN DEFAULT FALSE,
  escala_perder_control TINYINT,        -- 1 a 5
  escala_pasatiempo_inofensivo TINYINT, -- 1 a 5
  -- percepcion_por_que_apuesta_su_edad (múltiple, columnas booleanas):
  percepcion_diversion BOOLEAN DEFAULT FALSE,
  percepcion_publicidad_influencers BOOLEAN DEFAULT FALSE,
  percepcion_curiosidad BOOLEAN DEFAULT FALSE,
  percepcion_ganar_plata BOOLEAN DEFAULT FALSE,
  percepcion_aburrimiento BOOLEAN DEFAULT FALSE,
  percepcion_amigos_familia BOOLEAN DEFAULT FALSE,
  percepcion_otro BOOLEAN DEFAULT FALSE,
  escala_puede_ganar_plata TINYINT,     -- 1 a 5

  -- Sección 5 (opcional)
  comentario_abierto TEXT
);
```

Nota: no hay columna para "¿Te animás a participar?" / "¿Aceptás participar?" en ninguna de las dos tablas. Si la respuesta es "No", el frontend corta ahí y nunca llama al endpoint de guardado — no tiene sentido guardar una fila vacía de alguien que no participó.

### 8.4 Exportación de datos

Dos entregables por encuesta, cada uno con su propio endpoint protegido:

1. **Excel** (`exceljs`): datos crudos, una fila por respuesta. `exceljs` no tiene buen soporte para gráficos nativos de Excel, así que este archivo se limita a los datos.
2. **Dashboard web** (páginas separadas, protegidas): gráficos con Chart.js en el navegador, alimentados por los endpoints de agregación en SQL. El formato de columnas booleanas (sección 3) hace estas agregaciones triviales: contar cuántos marcaron una opción es un `SUM(columna)`.

### 8.5 Servidor y despliegue

- Backend Node.js corriendo localmente en la PC de Juli.
- Expuesto a internet con **ngrok** (dominio estático gratuito, no cambia entre reinicios) — se descartó Render por el free tier de PostgreSQL con expiración a 30 días y el disco efímero en servicios gratuitos, que no combina bien con MySQL/XAMPP y agrega una tecnología nueva a mitad de proyecto.
- Un solo QR con selector de edad al entrar, o dos QR distintos (uno por encuesta) si se prefiere saltear el paso de preguntar la edad para enrutar — **PENDIENTE decidir cuál de los dos.**
- Duración: **PENDIENTE confirmar si son 7 días para ambas o si difiere por encuesta.** Checklist antes de apagar (por cada encuesta activa):
  1. Exportar el Excel final.
  2. Backup del dump de MySQL (`mysqldump`) de ambas tablas.
  3. Recién ahí detener el proceso de Node y cerrar el túnel de ngrok.

## 9. Estructura de carpetas sugerida

```
encuesta-ludopatia/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── respuestas-adultos.js
│   │   ├── respuestas-adolescentes.js
│   │   ├── dashboard.js
│   │   └── export.js
│   ├── db/
│   │   └── conexion.js
│   ├── middleware/
│   │   └── auth.js
│   └── .env
├── frontend/               ← archivos exportados de Claude Design
├── database/
│   └── schema.sql
└── docs/
    └── PLAN-encuesta-ludopatia.md   ← este documento
```

## 10. Fases de implementación sugeridas

1. Base de datos: `schema.sql` con ambas tablas.
2. Backend: endpoints de guardado para las dos encuestas + conexión a MySQL.
3. Frontend: pantalla de entrada (edad → enrutamiento) + maquetado de ambas encuestas en Claude Design, con su lógica de bifurcación.
4. Integración frontend ↔ backend.
5. Dashboards: endpoints de agregación + páginas con Chart.js (uno por encuesta).
6. Exportación a Excel (una por encuesta).
7. Autenticación simple para `/dashboard` y `/export`.
8. Despliegue: ngrok + generación de QR.
9. Pruebas end-to-end de ambas encuestas y todas sus ramas.
10. Checklist de cierre al vencer el plazo (backup + apagado).

## 11. Consideraciones éticas

- Ninguna de las dos encuestas pide datos identificatorios.
- Copy neutral, sin alusiones estigmatizantes.
- Pantalla de consentimiento explícita en ambas (ver sección 6 para adultos), con intro que explica anonimato y propósito.
- La encuesta de adolescentes trata un tema sensible en menores de edad. Como ya viene corriendo en Forms, se asume que el instituto ya tiene resuelto el consentimiento institucional correspondiente — **confirmar que esto sigue vigente** al migrar de plataforma, ya que es una cuestión institucional, no técnica.
