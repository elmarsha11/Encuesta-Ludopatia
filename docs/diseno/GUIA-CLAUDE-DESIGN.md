# Guía para usar Claude Design en este proyecto

> Para Juli, que nunca lo usó. Claude Design está en beta y su interfaz cambia seguido: si un botón no se llama exactamente como dice acá, buscá el equivalente.

## Qué es y cómo encaja

Claude Design ([claude.ai/design](https://claude.ai/design), disponible en los planes Pro, Max, Team y Enterprise) genera diseños y **prototipos interactivos** a partir de una conversación. Lo importante para nosotros:

- **Puede leer este repositorio de GitHub.** Por eso dejamos el brief, el contenido y el contrato en `docs/diseno/`: no hace falta copiar y pegar las preguntas.
- **Se itera conversando** y comentando sobre partes del diseño.
- **Termina en un "handoff" a Claude Code:** un paquete con el HTML/CSS/JS del prototipo, capturas y un README. Con eso implementamos el frontend real conectado al backend.

Lo que **no** hace: no se conecta a nuestra base ni guarda respuestas. Lo que sale de Claude Design es el **diseño**; el funcionamiento lo pone el backend que ya construimos.

## Paso a paso

### 0. Antes de empezar
- Tener mergeado (o al menos subido) el pull request con `docs/diseno/`.
- Entrar a claude.ai/design con tu cuenta.

### 1. Crear el proyecto de adolescentes
1. Nuevo proyecto → nombre: **Encuesta adolescentes**.
2. Conectar el repositorio `elmarsha11/Encuesta-Ludopatia` (opción de GitHub o código).
3. Pegar el **Prompt 1** (abajo).

Claude Design suele proponer **variantes**. Mirá cada una **en tamaño de celular** antes de opinar.

### 2. Iterar (la parte más importante)
Reglas que funcionan:
- **Una cosa por vez y concreta.** «Los botones de opción tienen poco espacio entre sí; llevalo a 12 px» funciona mejor que «no me convence».
- **Decí qué sentís, y por qué.** «Esto parece un formulario de la escuela; quiero que se sienta más privado» le da una dirección.
- **Nombrá el componente.** «En la escala 1 a 5…», «En la pantalla final…».
- **Pedí revisión:** «Revisá el contraste y el tamaño de las zonas táctiles según WCAG AA».
- **Probá con un adolescente real** si podés: mostrale el prototipo sin explicarle nada y mirá dónde duda.

### 3. Repetir con adultos
Proyecto aparte: **Encuesta adultos**, con el **Prompt 2**. Son identidades distintas a propósito.

### 4. Unificar los componentes
Cuando las dos direcciones te gusten, pegá el **Prompt 3** en cualquiera de los dos proyectos. Sirve para confirmar que ambas usan **los mismos componentes**, con distinto tema.

### 5. Handoff
Usá la opción de enviar a Claude Code (o exportar el paquete de handoff / ZIP). Después traelo a esta sesión o subilo al repo en `design/`. Desde ahí implementamos el frontend real.

---

## Prompt 1 — Adolescentes

```
Vas a diseñar una encuesta web anónima para adolescentes de 12 a 17 años sobre juego y apuestas online.
Antes de diseñar, leé en el repositorio:
- docs/diseno/BRIEF-DISENO.md (principios, dirección visual, prohibiciones, pantallas y estados)
- docs/diseno/contenido-adolescentes.md (texto exacto de cada pantalla y pregunta, y las ramas)
- docs/diseno/CONTRATO-FRONTEND.md (cómo se conecta con el backend)

Objetivo: que un adolescente sienta curiosidad y confianza para responder con sinceridad. No tiene que ser divertida (el tema es serio) ni verse "de la escuela". Tiene que ser actual y cuidada, propia de su edad sin ser infantil, con detalles ligados al tema (su mundo de videojuegos) sin glorificar el juego ni las apuestas.

Quiero un prototipo interactivo mobile-first (390 px) con:
1. Las pantallas de inicio + consentimiento, edad (incluido el estado fuera de rango), título de sección, una pregunta de cada tipo (única, múltiple con opción exclusiva, escala 1-5, texto libre), progreso, error de envío, encuesta cerrada y pantalla final con líneas de ayuda.
2. Un sistema de componentes reutilizables (no pantallas armadas a mano): las preguntas se van a dibujar a partir de datos.
3. Colores, tipografía y espaciado definidos como tokens.

Proponeme 2 direcciones visuales distintas antes de profundizar en una. Respetá estrictamente la sección "Prohibido" del brief.
```

## Prompt 2 — Adultos

```
Vas a diseñar una encuesta web anónima para estudiantes adultos (18+) de un instituto terciario sobre apuestas, situación económica y educación financiera. La encargó un grupo de estudiantes de Administración Financiera.
Antes de diseñar, leé en el repositorio:
- docs/diseno/BRIEF-DISENO.md
- docs/diseno/contenido-adultos.md
- docs/diseno/CONTRATO-FRONTEND.md

Objetivo: seriedad, claridad y respeto por el tiempo de quien responde, con un estilo editorial y cálido. Los adultos leen más y prestan atención a los detalles: aprovechalo con las notas «¿Por qué preguntamos esto?» (campo `ayuda`), que tienen que estar al alcance sin estorbar. Todas las preguntas son obligatorias.

Quiero un prototipo interactivo mobile-first (390 px) con:
1. Inicio + consentimiento, edad (con fuera de rango), título de sección, pregunta de opción única (la carrera, con opciones agrupadas), múltiple con opción exclusiva, slider de 5 pasos que arranca vacío (ingresos, en salarios mínimos con su equivalente en pesos), una pregunta del bloque PGSI (escala 0-3 con las respuestas siempre en la misma posición), la pantalla informativa de educación financiera, progreso, error de envío, encuesta cerrada y pantalla final con líneas de ayuda.
2. Un sistema de componentes reutilizables y tokens de diseño.

Proponeme 2 direcciones visuales distintas antes de profundizar en una. Respetá estrictamente la sección "Prohibido" del brief (nada que remita a casinos, incluido el dorado).
```

## Prompt 3 — Unificar

```
Tenemos dos encuestas con identidades distintas (adolescentes y adultos) que se van a implementar con UN SOLO motor de componentes en HTML/CSS/JS sin framework, cambiando solo un tema de variables CSS.
Revisá los componentes de las dos direcciones elegidas y armá:
1. La lista única de componentes, con sus estados (normal, seleccionado, deshabilitado, error, foco).
2. Dos temas como variables CSS (colores, tipografías, radios, sombras, espaciado, duración de animaciones).
3. Una lista de lo que un tema NO puede cambiar (estructura, tamaños táctiles mínimos, orden de los elementos).
Señalame cualquier diferencia entre las dos direcciones que no se pueda resolver solo con variables.
```
