# Handoff de diseño · Dashboard de resultados

> Para Claude Code. Diseño en Claude Design, sobre la identidad **Papel y tinta** (`design/adultos/tema-b.css`).
> Acompaña a `docs/diseno/dashboard/BRIEF-DASHBOARD.md` y a los `ejemplo-*.json` de esa carpeta.

## Estado: exploración, no diseño final

Hoy hay **dos direcciones visuales para los gráficos** (1a y 1b), para elegir una. Todavía **no** están diseñadas:
el acceso, la navegación por secciones, Control (celular), los estados ni la impresión.
**No implementar la página completa hasta que se elija la dirección.** Lo que sí se puede hacer ya:
el cargador del JSON, los cálculos (`n / base`) y la regla de celdas ocultas, que valen para las dos.

## Qué hay en esta carpeta

| Archivo | Qué es | Cómo usarlo |
|---|---|---|
| `prototipo/Direcciones graficos.dc.html` | Las dos direcciones lado a lado, dibujadas desde `ejemplo-adultos-grupo.json`. | **Referencia**, NO copiarlo: usa el formato de Claude Design (`<x-dc>`, `{{ }}`, `<sc-for>`, `<sc-if>`, `DCLogic`). Hay que traducirlo a HTML/CSS/JS sin framework, igual que las encuestas. Carga `design/adultos/tema-b.css` y `docs/diseno/dashboard/ejemplo-adultos-grupo.json` con rutas desde la raíz del repo. |

## Reglas que valen para las dos direcciones

1. **Tokens:** los de `tema-b.css` (`:root`). Nada nuevo salvo estos, derivados de ellos (van en la hoja del dashboard):
   ```css
   --pgsi-0: var(--color-seleccion-fondo);                                              /* Sin riesgo */
   --pgsi-1: color-mix(in oklch, var(--color-acento) 38%, var(--color-seleccion-fondo)); /* Riesgo bajo */
   --pgsi-2: color-mix(in oklch, var(--color-acento) 72%, var(--color-seleccion-fondo)); /* Riesgo moderado */
   --pgsi-3: var(--color-acento);                                                       /* Juego problemático */
   --trama-oculto: repeating-linear-gradient(135deg, var(--color-pista) 0 1.5px, var(--color-superficie) 1.5px 8px); /* solo 1b */
   ```
   Nada de rojo ni dorado. La terracota solo va en el filete corto de apertura de sección (48×2 px), como en `.seccion::before`.
2. **Tipografía:** Newsreader (títulos, cifras, notas en itálica) e Instrument Sans (rótulos, etiquetas). Rótulos en versalitas: 14 px, peso 600, `letter-spacing: .09em`, `--color-texto-3`. Cifras con `font-variant-numeric: tabular-nums`.
3. **Porcentaje:** `Math.round(100 * n / base)` + `%`. Siempre con su base al lado (`n = 84`).
4. **Celda oculta** (`oculto: true` o `n: null`): no se dibuja nada que tenga largo o alto proporcional. Se escribe «Oculto» (1b) u «Oculto para proteger el anonimato» (1a) en Newsreader itálica 17 px, `--color-texto-2`.
5. **Fila de cruce oculta:** si **alguna** celda de la fila está oculta, se trata la fila entera como oculta (el JSON trae `fila.oculto: false` aunque sus celdas estén ocultas: no confiar en ese campo).
6. **Cruce entero oculto:** si todas las filas quedan ocultas (`riesgo_deudas`), en vez del gráfico va el mensaje: «Este cruce no se muestra. No hay suficientes respuestas en cada grupo para mostrarlo sin arriesgar el anonimato.», con las bases de cada fila.
7. **Cruces:** se leen por fila («Se lee por fila: cada fila suma 100%.») y llevan cerca la nota «Muestra cómo se relacionan dos respuestas; no indica que una cause la otra.».
8. **Barra apilada del PGSI:** solo si ninguna categoría está oculta. Si hay alguna oculta, dibujarla como renglones (1a) o columnas (1b), porque en una barra apilada el hueco revelaría el valor.
9. **Accesibilidad:** cada gráfico lleva `role="img"` y un `aria-label` con todos los datos en texto (por ejemplo: «Sin riesgo: 0% (0); Riesgo bajo: 25% (8); …»).

## Dirección 1a · Renglones

- **Encabezado:** rótulo «Resultados · Encuesta de adultos», `h2` Newsreader 38/500, «84 respuestas completas», y la línea de anonimato en itálica 17 px. Filete de tinta (1 px `--color-texto`) debajo.
- **Hallazgos:** grilla de 3 columnas (1fr 1fr 2fr), con filete de tinta arriba y filetes suaves entre columnas.
  - Respondieron: cifra Newsreader 56 px.
  - Apostó en 12 meses: si «Sí» está oculto, va «Oculto por anonimato» (itálica 26 px) y, debajo, lo que sí se puede mostrar («No apostó: 61% · 51 de 84»).
  - PGSI: barra apilada de 28 px con los 4 tonos `--pgsi-*` y leyenda en 4 columnas (muestra, nombre, % en 24 px, «n personas»).
- **Pregunta:** renglones con grilla `300px 1fr 64px 56px` y `min-height: 48px`, separados por `--color-borde-suave`. La pista mide 12 px (`--color-borde-suave`) y el relleno va en `--color-acento`, con ancho igual al % sobre 100 (escala absoluta). El % va en Newsreader 20 y n en 15 px. En una fila oculta, las columnas 2 a 4 se reemplazan por un punteado de 24 px más el texto.
- **Cruce:** filas con grilla `300px 1fr` (etiqueta + `n = base` / barra dividida de 32 px). El primer segmento va en `--color-acento` con texto `--color-sobre-seleccion` y el segundo en `--color-borde-suave` con texto de tinta, cada uno con su %.

## Dirección 1b · Casilleros

- **Hallazgos:** 3 bloques (1fr 1fr 2fr, `gap: 32px`) con filete de tinta de 2 px arriba. La cifra de Respondieron va en 72 px. En Apostó oculto va la trama de 68 px con la etiqueta «Oculto» sobre `--color-superficie`. El PGSI va en columnas de 132 px de alto (alto relativo al máximo), con el % arriba y la línea de base en tinta.
- **Pregunta (escala):** columnas en `repeat(6, 1fr)` sobre un área de 200 px, con alto relativo al máximo y el % arriba en 24 px. Una columna oculta muestra «Oculto» y una franja de trama de **10 px fija** sobre la línea de base, nunca una columna alta.
- **Cruce (tabla sombreada):** grilla `260px repeat(columnas, 1fr)` con gap de 4 px y celdas de 72 px de alto. El fondo es `color-mix(in oklch, var(--color-acento) {round(pct × 0.45)}%, var(--color-superficie))`. Cada celda muestra el % en Newsreader 28 y «n de base» en 14 px. Una celda oculta lleva `--trama-oculto` y la etiqueta «Oculto», del mismo tamaño que las visibles.

## Aviso para el backend: bases que revelan celdas ocultas

En `ejemplo-adultos-grupo.json` hay celdas ocultas que se pueden despejar mirando las bases de otras preguntas:

- `aposto_12m` oculta «Sí», pero la base de `frecuencia` (y de toda la rama de hábitos y el PGSI) es 32.
- `tiene_deudas` oculta «Sí», pero la base de `deuda_relativa` es 35, igual que la base de la fila «Tiene deudas» en `aposto_deudas`.

Esto no se arregla en el diseño. La supresión tiene que considerar las bases de las preguntas de rama y de los cruces, o bien ocultar esas bases.

## Pendiente de diseño

Elegir 1a o 1b. Después: acceso, resultados completos a 1280 px con índice de secciones, celular, Control de Juli a 390 px (participación, embudo, evolución por día), estados (cargando, sin respuestas, sesión vencida, error de conexión) e impresión.
