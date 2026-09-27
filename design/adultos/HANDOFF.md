# Handoff de diseño · Encuesta adultos

> Para Claude Code. Diseño en Claude Design (canvas "Encuesta adultos"), dirección **Papel y tinta**.
> Objetivo: implementar el frontend real de `/adultos` según `docs/diseno/CONTRATO-FRONTEND.md`,
> con el **mismo motor** que `/adolescentes` y este tema.

## Qué hay en esta carpeta

| Archivo | Qué es | Cómo usarlo |
|---|---|---|
| `tema-b.css` | Tokens (`:root`, mismos nombres que `tema-a.css`) + clases de todos los componentes. **Fuente de verdad del aspecto.** | Copiarlo tal cual al frontend. `/adultos` carga `tema-b.css`, `/adolescentes` carga `tema-a.css`. Nada más cambia entre las dos páginas. |
| `fuentes/` | Newsreader (normal e itálica) e Instrument Sans, en woff2 variables (eje de peso), licencia OFL. En total, unos 150 KB. | Servirlas desde nuestro servidor. Prohibido usar CDN (brief, sección 5). |
| `prototipo/Encuesta.dc.html` | Prototipo interactivo: **referencia de comportamiento y de marcado**. | Leerlo, NO copiarlo: usa el formato de Claude Design (`<x-dc>`, `{{ }}`, `<sc-if>`, `<sc-for>`, `DCLogic`). Hay que traducirlo a JS vanilla, igual que el de adolescentes. |
| `prototipo/Componentes.dc.html` | Cada componente en sus estados, con los nombres de clase. | Referencia visual del marcado. |
| `prototipo/Tokens.dc.html` | Hoja de tokens. | Referencia. Si difiere de `tema-b.css`, **manda `tema-b.css`**. |

En el canvas, `tema-b.css` apunta a las fuentes subidas como archivos del canvas (`/_blob/...`). La copia de esta carpeta apunta a `fuentes/`. Es la única diferencia.

## Un motor, dos temas

El motor de adolescentes sirve tal cual, con cuatro agregados que **no dependen de la encuesta**, sino de la forma de cada pregunta:

1. **Qué componente dibuja una `escala`** (`componenteEscala()` en el prototipo):
   - `presentacion: 'slider'` → **tramos** (`.tramos`).
   - Etiqueta en **cada** punto (PGSI) → **frecuencia** (`.frecuencia`).
   - Etiquetas solo en los extremos (adolescentes) → escala de **puntos** (`.escala`), como hasta ahora.
2. **Opciones agrupadas.** Si las opciones traen `grupo`, se dibujan por grupos consecutivos (`.opciones-grupo` con `role="group"` y `aria-labelledby` apuntando a `.opciones-grupo-titulo`). Sin `grupo` hay un solo grupo sin rótulo, así que adolescentes no cambia. Un grupo de **una** opción que se llama igual que el grupo («Educación Inicial») no muestra rótulo.
3. **Nota de ayuda.** Si la pregunta trae `ayuda`, debajo del `h1` va el botón «¿Por qué preguntamos esto?».
4. **Pantalla `info`.** Título y texto. No se responde, no se envía y no cuenta en el progreso.

La obligatoriedad sale de `respuestasObligatorias` (y de `obligatoria` en cada pregunta), no del nombre de la encuesta:

- Obligatoria sin responder: «Siguiente» con `disabled`.
- Opcional sin responder (adolescentes): «Saltar», como antes.

## Estructura de pantalla (igual que adolescentes)

```
main.app
├─ header.barra      → solo .anonima. En B lleva un filete de tinta debajo.
├─ .progreso-bloque  → SIEMPRE presente (espacio duro en portada, títulos de sección y final)
├─ (sin zona decorativa: adultos no usa .motivo)
├─ .contenido        → lo único que se desliza entre pantallas
└─ .pie              → Atrás a la izquierda, acción a la derecha, sobre un filete
```

## Componentes nuevos

### Tramos: slider de 5 pasos (`.tramos`)

Es un **grupo de 5 radios**, no un `<input type="range">`:

- Un range nativo siempre tiene un valor: no puede arrancar vacío, y un lector de pantalla anunciaría «3» sin que nadie haya elegido nada.
- Con radios, «sin respuesta» existe de verdad, las flechas del teclado recorren los escalones sin JS extra, y el componente es primo de `.punto`.

Estados y marcado:

- **Estados:** sin valor (`.tramos-vacio`), elegido (`.tramo--marcado`) y los de la izquierda (`.tramo--debajo`, relleno suave: se lee como una medida).
- **Altura de los escalones:** `--alto-tramo-min + --alto-tramo-paso × índice`. La pone el CSS con `:nth-child`, el motor no calcula nada.
- **Lectura grande (`.tramos-lectura`):**
  - Muestra la etiqueta del paso elegido.
  - Si la pregunta trae `rangosSmvm`, agrega los pesos (ver backend). Formato: «$383.800 a $767.600 por mes», «Hasta $383.800 por mes», «Más de $1.919.000 por mes».
  - Es `aria-hidden`: cada radio ya lleva su texto completo en `.solo-lector`.
- **Sin autoavance:** se confirma con «Siguiente», como dice el brief.

### Frecuencia: escala 0 a 3 del PGSI (`.frecuencia`)

- **Posición fija.** Las 4 respuestas van **ancladas abajo** (`.frecuencia-pregunta` + `.frecuencia-zona{margin-top:auto}`), justo encima del pie y no pegadas a la pregunta. Las 9 preguntas miden entre 1 y 4 renglones: ancladas abajo quedan en el mismo píxel en todas las pantallas y en la zona del pulgar.
- **Contador.** Arriba va «Pregunta n de 9» (`.frecuencia-contexto`), calculado sobre las preguntas de frecuencia de la misma sección (`contextoFrecuencia()`). El «Pensando en los últimos 12 meses…» ya está en el rótulo de progreso, que es el título de la sección.
- **Barritas.** Las `.frecuencia-grado` (0 a 3 encendidas) son decorativas (`aria-hidden`). No usan números, para no sugerir un puntaje.
- **Autoavance**, igual que la opción única: solo con toque o clic (`event.detail > 0`).

### ¿Por qué preguntamos esto? (`.porque`)

- **Marcado:** `<button class="porque-boton" aria-expanded aria-controls="nota-porque">` y debajo `<p class="porque-texto" id="nota-porque">`, que solo existe cuando está abierta.
- **Por qué no `<details>`:** el motor tiene que **cerrarla al cambiar de pantalla**. Con `<details>` el navegador puede reutilizar el nodo y la nota siguiente aparecería abierta.
- **Ubicación:** va entre la pregunta y las respuestas. Empuja el contenido, nunca lo tapa, y se lee en el orden natural.

### Pantalla informativa (`.info`)

`h1.info-titulo` y `p.info-texto` (con capitular). En adultos es el último paso, así que el pie dice «Enviar».

## Comportamientos (diferencias con adolescentes)

- **Todas obligatorias:** no existe «Saltar». «Siguiente» se ve deshabilitado (contorno apagado) hasta responder. En edad, se deshabilita con el campo vacío y valida el rango al tocar.
- **Progreso:** no cuenta las pantallas `info`.
- **Ritmo:** un poco más ágil (`--pausa-autoavance: 650ms`, `--dur-salida: 220ms`), porque el bloque PGSI son 9 pantallas seguidas. El motor sigue leyendo esos valores del CSS.
- **Foco:** anillo **terracota**, distinto del verde azulado de la selección, para que «tengo el foco acá» no se confunda con «elegí esto».
- **Igual que en adolescentes:** galería entre pantallas, foco al `h1`, `prefers-reduced-motion`, envío, error con reintento sin perder respuestas, encuesta cerrada, `tel:` en las líneas de ayuda.

## Cambios pendientes en el backend

1. **`rangosSmvm` en `ingresos_hogar`** (`backend/encuestas/adultos.js`):
   ```js
   // Cuántos salarios mínimos abarca cada paso; el frontend lo multiplica por smvmReferencia.
   rangosSmvm: { 1: [0, 1], 2: [1, 2], 3: [2, 3], 4: [3, 5], 5: [5, null] },
   ```
   Sin este campo, el frontend tendría que reconocer la pregunta por su `id` para saber que lleva pesos. Eso ata el diseño a un nombre y se rompe en silencio si alguien lo cambia. Pasarlo también por `definicionPublica` (ya pasa `preguntas` enteras, así que no hace falta tocarla) y agregarlo a `generar-contenido.js` si se quiere ver en `contenido-adultos.md`.
2. **`smvmReferencia`:** actualizar al valor vigente en octubre de 2026 (ya figura como PENDIENTE).
3. **Encuesta cerrada:** la misma propuesta que en adolescentes (`abierta`, `proximaApertura`). Faltan las franjas horarias reales.

## Textos a confirmar con el grupo

- Marcados `// PROPUESTA` en `this.ui` del prototipo:
  - Botones y avisos: Enviar, Probar de nuevo, «Podés marcar más de una.», «Enviando tus respuestas…», errores y encuesta cerrada.
  - Tramos: «Elegí el escalón que más se acerque.», «Menos» / «Más», «por mes», «Hasta…», «Más de…».
  - PGSI: «Pregunta n de 9».
- «Todas las preguntas son obligatorias» y «Prefiero no decir» (género) conviven bien. Pero en ingresos y deudas no hay forma de no responder. Es una decisión del grupo, no del diseño: si en la prueba piloto la gente abandona en esas pantallas, considerar una opción «Prefiero no responder».
- Números de las líneas de ayuda: pendientes de verificación final.
