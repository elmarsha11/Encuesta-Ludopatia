# Handoff de diseño · Encuesta adolescentes

> Para Claude Code. Diseño aprobado en Claude Design (canvas "Encuesta adolescentes").
> Objetivo: implementar el frontend real de `/adolescentes` según `docs/diseno/CONTRATO-FRONTEND.md`,
> con HTML, CSS y JavaScript **sin framework**, usando este diseño.

## Qué hay en esta carpeta

| Archivo | Qué es | Cómo usarlo |
|---|---|---|
| `tema-a.css` | Tokens (`:root`) + clases de todos los componentes. **Fuente de verdad del aspecto.** | Copiarlo tal cual al frontend. No reescribir los estilos. |
| `fuentes/` | Space Grotesk y Atkinson Hyperlegible Next (woff2, licencia OFL). | Servirlas desde nuestro servidor. Prohibido usar CDN (brief, sección 5). |
| `prototipo/Encuesta.dc.html` | Prototipo interactivo: **referencia de comportamiento y de marcado**. | Leerlo, NO copiarlo. Usa un formato propio de Claude Design (`<x-dc>`, `{{ }}`, `<sc-if>`, `<sc-for>`, `class Component extends DCLogic`) que el navegador no entiende. Hay que traducirlo a JS vanilla. |
| `prototipo/Componentes.dc.html` | Cada componente en todos sus estados, con los nombres de clase. | Referencia visual del marcado de cada componente. |
| `prototipo/Tokens.dc.html` | Hoja de tokens. | Referencia. Si difiere de `tema-a.css`, **manda `tema-a.css`**: los valores de movimiento de esta hoja están desactualizados. |

## Arquitectura esperada

Un solo motor que:

1. Pide la definición con `fetch('/api/encuestas/adolescentes')`. En el prototipo está copiada en el constructor como `this.def`.
2. Arma la lista de pasos del camino actual: un título de sección antes de la primera pregunta visible de cada sección (`pasos()`).
3. Dibuja cada paso con un componente según `tipo`: `numero`, `unica`, `multiple`, `escala`, `texto`. Las preguntas **no** se escriben en el HTML.
4. Aplica `visibleSi` y descarta las respuestas de ramas que dejaron de ser visibles (`limpiar()`).
5. Arma el cuerpo del POST con solo las preguntas visibles respondidas, con el tipo correcto (`cuerpo()`).
6. Guarda el progreso en `sessionStorage` y lo borra al recibir el 201. **El prototipo no lo hace.**

Las funciones `visible`, `limpiar`, `pasos`, `progreso`, `avanceMotivo`, `cuerpo`, `alternar` y `pixeles` del prototipo son JS puro: se pueden portar casi sin cambios.

## Estructura de pantalla (no cambiar el orden)

```
main.app
├─ header.barra      → solo .anonima (siempre visible)
├─ .progreso-bloque  → SIEMPRE presente. En portada y final el nombre de sección es un espacio duro;
│                      así nada se mueve de lugar entre pantallas.
├─ .motivo           → 18 píxeles (.px), aria-hidden
├─ .contenido        → lo único que se desliza entre pantallas
└─ .pie              → FUERA de .contenido. «Atrás» a la izquierda (.btn-volver), acción a la derecha (.pie-accion)
```

## Comportamientos clave

- **Paso de pantalla tipo galería.** Primero se aplica `.salir-adelante` o `.salir-atras` durante `--dur-salida`. Después se cambia la pantalla y se aplica `.entrar-{adelante|atras}-{0|1}`. El sufijo 0/1 alterna en cada cambio para reiniciar la animación. En el frontend real se puede mejorar: dibujar las dos pantallas a la vez, así la saliente y la entrante se ven juntas, como en una galería de fotos.
- **Los tiempos se leen del CSS.** `getComputedStyle(main).getPropertyValue('--dur-salida')` y `'--pausa-autoavance'`. No repetir esos números en JS.
- **Autoavance** en `unica` y `escala`: solo si el toque fue con dedo o mouse (`event.detail > 0`), después de `--pausa-autoavance`. Con teclado (flechas o espacio) se elige sin avanzar y se usa «Siguiente». Si no se hace así, el teclado saltaría de pregunta.
- **Pie:**
  - Sin responder en una pregunta opcional: «Saltar» (`.btn--secundario`).
  - Respondida: «Siguiente» (`.btn--primario`).
  - Última pregunta: «Enviar».
  - Edad vacía: «Siguiente» deshabilitado.
- **Edad:** se valida al tocar «Siguiente», no mientras se escribe. Si está fuera de rango aparece `.aviso` en la misma pantalla, el campo sigue editable y no se avanza.
- **Opción múltiple con exclusiva:** marcar la exclusiva desmarca las demás, y marcar otra desmarca la exclusiva. La exclusiva va separada por `.separador`.
- **Progreso:** se calcula sobre el camino actual y cuenta las ramas todavía no decididas, así la barra nunca retrocede.
- **Motivo de píxeles:**
  - El avance cuenta todas las pantallas, desde la portada (0) hasta el final (1), con la curva `1 - (1 - a)²`.
  - La fila final va de margen a margen: el motor mide el ancho de `.motivo`.
  - En la primera carga los píxeles aparecen de a uno.
  - Hay una onda constante con la animación CSS `ola`, desfasada con `animation-delay` negativo por píxel.
- **Accesibilidad:**
  - Inputs reales (radio y checkbox) ocultos pero enfocables.
  - `fieldset` + `legend` con el `h1` de la pregunta.
  - Al cambiar de pantalla: scroll arriba y foco al `h1` (`tabindex="-1"`).
  - Respetar `prefers-reduced-motion`: el CSS ya apaga las animaciones y el JS se saltea la fase de salida.
- **Líneas de ayuda:** enlaces `tel:` en la pantalla final.

## Cambios pendientes en el backend (hacer antes o junto con el frontend)

1. **Portada con puntos.** En `backend/encuestas/adolescentes.js` → `pantallas.intro`:
   ```js
   intro: {
     titulo: '¿Cuándo el juego deja de ser un juego?',
     texto: 'Queremos entender qué pasa con las apuestas online entre los jóvenes hoy.',
     puntos: [
       { destacado: '100% anónima', texto: 'no te pedimos nombre, mail ni ningún dato personal.' },
       { destacado: 'Rápida', texto: 'te lleva 3 minutos.' },
       { destacado: 'Cero juzgar', texto: 'no hay respuestas correctas ni incorrectas, solo nos sirve tu realidad.' },
     ],
     cierre: 'Respondé lo que vivís vos o lo que ves en tu grupo. Podés dejarla cuando quieras.',
   },
   ```
   `puntos` y `cierre` son opcionales (adultos sigue solo con `texto`). Actualizar también `scripts/generar-contenido.js` para que imprima los puntos (`- **destacado:** texto`) y el cierre, y correr `npm run contenido`.
2. **Encuesta cerrada.** El backend no informa si la encuesta está abierta. Propuesta:
   - Que la definición incluya `abierta` y `proximaApertura`.
   - Que el POST se rechace fuera de horario, con unos minutos de tolerancia para quien ya estaba respondiendo.
   - Faltan las franjas horarias reales.

## Textos a confirmar con el grupo

- Marcados `// PROPUESTA` en `this.ui` del prototipo: Enviar, Probar de nuevo, «Podés marcar más de una.», «Enviando tus respuestas…», los mensajes de error y el de encuesta cerrada.
- «ningún dato personal»: se pide edad y género. Alternativa más precisa: «ningún dato que te identifique».
- Números de las líneas de ayuda: pendientes de verificación final.
