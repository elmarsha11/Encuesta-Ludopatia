# Brief de diseño · Dashboards de resultados

> Para Claude Design. Acompaña a los datos de ejemplo de esta carpeta (`ejemplo-*.json`).
> Los datos son **inventados** pero tienen la forma exacta que entrega el servidor.

## 1. Qué es

Una página web protegida con contraseña donde se ven los resultados de las dos encuestas sobre apuestas (ver `docs/PLAN-encuesta-ludopatia.md`). Todos los números llegan **ya calculados** del servidor: la página solo los muestra.

## 2. Quién la usa (tres accesos, un solo diseño)

| Acceso | Qué ve | Cuándo | Cómo lo va a leer |
|---|---|---|---|
| **Grupo de Administración Financiera** | Resultados de adultos, con cantidades chicas ocultas | Al cerrar la encuesta (después del 23/10) | En la computadora, con tiempo, para armar un trabajo. Probablemente impriman o saquen capturas |
| **Docentes** (escuela) | Resultados de adolescentes, con cantidades chicas ocultas | Al cerrar la encuesta | En la computadora o el celular, una lectura rápida |
| **Juli** (coordina el proyecto) | Todo, sin ocultar, más una sección de **Control** | Durante la semana de la encuesta, varias veces por día | En el celular, mirando cómo va la participación |

Es **un solo diseño** con las mismas piezas para los tres. Solo cambia qué secciones aparecen.

## 3. Tono

- Es una herramienta para leer datos, no una presentación. **Claridad antes que decoración.**
- Mismo espíritu que la encuesta de adultos, «Papel y tinta» (`design/adultos/tema-b.css`): editorial, serio, cálido. Se pueden reutilizar su tipografía y sus colores. La de adolescentes («Noche tranquila») es oscura y está pensada para responder, no para leer tablas: **no** usarla acá.
- **Prohibido** (igual que en las encuestas): nada que remita a casinos, fichas, dados, tragamonedas, dorado, verde paño, «jackpot». Nada de rojo alarmante para los números de riesgo: el tema es sensible y el dashboard lo van a ver docentes.

## 4. Reglas de los datos que el diseño TIENE que respetar

1. **Celdas ocultas.** Cuando `oculto: true`, el número (`n`) llega como `null`. Pasa cuando hay menos de 5 personas, y también en algunas celdas de 5 o más, para que la oculta no se pueda despejar restando. Hay que mostrarlo como un estado **normal y digno** («menos de 5» o «no se muestra, para proteger el anonimato»), nunca como un error o un dato faltante. Una barra oculta no debe tener un largo que insinúe su valor.
2. **Base.** Cada porcentaje se calcula sobre su `base` (quienes respondieron esa pregunta). **Mostrar siempre la base** al lado («n = 27»): un 50% que son 2 de 4 no es lo mismo que 40 de 80. Si `base` es `null`, toda la distribución está oculta.
3. **Cruces.** Se leen **por fila**: «entre quienes tienen deudas, el 29% apostó». Cada fila tiene su propia base. Hay cruces que llegan **enteros ocultos** (todas las filas con `n: null`, ver `riesgo_deudas` en el ejemplo de adultos): el diseño tiene que explicarlo con calma («no hay suficientes respuestas para mostrar este cruce sin arriesgar el anonimato»).
4. **Lenguaje.** Una encuesta tomada una sola vez muestra **asociaciones, no causas**. Cerca de los cruces tiene que haber una nota breve y visible: «Muestra cómo se relacionan dos respuestas; no indica que una cause la otra.»
5. **Opción múltiple.** En las preguntas `tipo: "multiple"` cada persona puede marcar varias opciones: los porcentajes **no suman 100%**. Indicarlo («podían elegir más de una»).
6. **PGSI.** `pgsi_categoria` es el nivel de riesgo según el cuestionario PGSI (solo quienes apostaron en el último año). Mostrarlo con tonos de una misma familia, sin semáforo rojo.
7. **Nunca hay respuestas individuales.** No diseñar tablas de «respuestas» ni búsquedas por persona: los datos no existen en la página.

## 5. Estructura de los datos

Ejemplos completos: `ejemplo-adultos-grupo.json`, `ejemplo-adolescentes-docentes.json` (vista de cada grupo) y `ejemplo-*-juli.json` (vista de Juli, con `umbral: 1` y la sección `control`).

```
{
  encuesta, titulo,
  umbral,                 // 5 = se ocultan cantidades chicas; 1 = no se oculta nada (Juli)
  respuestas,             // total de encuestas completas
  secciones: [{ id, titulo }],
  distribuciones: [{      // una por pregunta, en el orden de la encuesta
    id, seccion, tipo,    // tipo: unica | multiple | escala | numero | calculada
    texto, base, oculto,
    celdas: [{ valor, texto, n, oculto }]
  }],
  cruces: [{
    id, seccion,          // seccion: agrupador temático del cruce («Situación económica»)
    factor, resultado,    // «Apostó en los últimos 12 meses» según «Deudas»
    columnas: [{ valor, texto }],
    filas: [{ valor, texto, base, oculto, celdas: [{ valor, texto, n, oculto }] }]
  }],
  control: {              // SOLO en la vista de Juli
    embudo: { entraron, aceptaron, noParticiparon, edadFueraDeRango, completaron,
              pantallas: [{ id, texto, comun, vieron }],
              tramos: [{ desde, hasta, empezaron, siguieron, seFueron }] },
    porDia: [{ fecha, entraron, completaron }]
  }
}
```

Los porcentajes los calcula la página: `n / base`.

## 6. Pantallas

1. **Acceso**: un solo campo de contraseña y un botón. Sin usuario: la contraseña define qué se ve. Mensaje de error calmo si es incorrecta. Aclarar que es de uso restringido.
2. **Resultados**:
   - Encabezado: título de la encuesta, total de respuestas, fecha, y una línea que explique el anonimato («Las cantidades menores a 5 no se muestran»).
   - **Hallazgos principales** arriba: 3 o 4 cifras grandes (por ejemplo: cuántos respondieron, % que apostó, distribución PGSI). Que se entienda en 10 segundos.
   - **Cruces**, agrupados por su `seccion` (Situación económica, Entorno y publicidad, Educación financiera, Quiénes responden).
   - **Todas las preguntas**, agrupadas por la sección de la encuesta. Pueden ser muchas (36 en adultos), así que hace falta un índice o navegación por secciones.
3. **Control** (solo Juli, pensado para el **celular**): participación (entraron, no participaron, completaron), el **embudo de abandono** (en qué tramo se fue la gente, destacando el tramo con más abandonos) y la evolución **por día**.
4. **Estados**: cargando, sesión vencida («volvé a ingresar la contraseña»), sin respuestas todavía, error de conexión.

## 7. Requisitos técnicos (para que se pueda integrar)

- HTML, CSS y JavaScript **sin framework**, igual que las encuestas. Los gráficos se dibujan con **HTML/CSS o SVG a mano**, sin librerías de gráficos.
- **Sin recursos externos**: nada de CDN, Google Fonts ni íconos remotos. La política de seguridad del servidor los bloquea. Las tipografías se sirven desde el propio servidor (ya están las de «Papel y tinta»).
- Tokens en variables CSS, como en `tema-b.css`.
- Accesible: contraste AA, los gráficos con su dato también en texto (no solo color), navegable con teclado.
- **Escritorio primero** para Resultados (se lee en computadora), pero que funcione en el celular. **Celular primero** para Control.
- **Imprimible**: una hoja de estilos de impresión prolija (el grupo va a presentar resultados).
