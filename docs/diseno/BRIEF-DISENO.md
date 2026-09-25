# Brief de diseño — Encuestas sobre apuestas

> Documento para Claude Design (y para cualquier persona que diseñe). Explica qué hay que diseñar, para quién y con qué límites.
> El contenido exacto de cada pantalla está en `contenido-adolescentes.md` y `contenido-adultos.md`, generados desde el código. Si el texto de este brief y el de esos archivos no coinciden, **mandan los archivos de contenido**.

## 1. Qué es

Dos encuestas web **anónimas** sobre apuestas y juego problemático. Se responden desde el **celular**, escaneando un QR, en menos de 5 minutos.

| | Adolescentes | Adultos |
|---|---|---|
| Quiénes | Estudiantes de 12 a 17 años de una escuela de Chascomús (Bs. As.) | Estudiantes adultos (18+) de un instituto terciario de Chascomús |
| Dónde | En el aula, con compañeros al lado | En el instituto, en pausas o en clase |
| Obligatoriedad | Casi todo es opcional, con «Prefiero no responder» | Todas las preguntas son obligatorias |
| Actitud esperada | Leen poco y rápido, desconfían de lo "institucional", se distraen | Leen más, prestan atención a los detalles, quieren entender para qué sirve |
| Tema sensible | Puede haber apuestas con cuentas de otros o skins, y temor a ser descubiertos | Deudas, ingresos, 9 preguntas sobre pérdida de control (PGSI) |

**El objetivo del diseño en una frase:** que la persona sienta que puede responder con sinceridad. Si el diseño se ve "de la escuela" o "de control", mienten o abandonan; si se ve "de juego", la encuesta pierde seriedad.

## 2. Principios comunes a las dos encuestas

1. **Confianza antes que impacto.** La anonimidad tiene que *verse*, no solo decirse: un indicador discreto y permanente (por ejemplo, un candado con «Anónima») en todas las pantallas.
2. **Una pregunta por pantalla.** Cada pantalla tiene una sola decisión. Las pantallas de título de sección son breves y dan contexto.
3. **Serio no es frío.** Calidez en el tono, los espacios y los detalles, sin caer en lo lúdico.
4. **Diseños distintos, mismo esqueleto.** Cada encuesta tiene su identidad propia (colores, tipografía, ilustración, tono), pero los **mismos componentes** por dentro. Técnicamente se implementa como un único motor con dos temas (variables CSS). No hay que diseñar dos sistemas de interacción distintos.
5. **Nada que remita a apostar.** Ver la sección 5.

## 3. Dirección — Adolescentes (12-17)

**Sensación buscada:** curiosidad y confianza. Una conversación honesta con alguien que no te juzga, no un examen.

- **Tono visual:** propio de su edad, actual y cuidado, **no infantil**. Nada de mascotas, emojis gigantes ni colores de jardín de infantes. Tampoco "divertido": no es una encuesta para pasarla bien.
- **Detalles ligados al tema:** el título es «¿Cuándo el juego deja de ser un juego?». Hay lugar para una referencia sutil al mundo de los videojuegos, que es su terreno y el de las skins, **siempre que no glorifique** el juego ni el apostar (por ejemplo, un motivo gráfico de píxeles o grilla muy discreto que se "aquieta" a medida que avanza). Explorar y proponer.
- **Color (propuesta de partida, se puede discutir):** base oscura azul-violeta profunda (se siente privada, "nadie está mirando"), con acentos suaves (lila, aguamarina) y un color cálido para la acción principal. Evitar el neón y la combinación rojo/negro/dorado.
- **Tipografía (propuesta):** una sans con algo de personalidad para los títulos (tipo grotesca geométrica) y una sans muy legible para el texto. Tamaños generosos.
- **Texto:** frases cortas, voseo, cercano sin forzar la jerga.
- **Curiosidad sin juego:** micro-transiciones cuidadas entre preguntas y títulos de sección que "abren" la siguiente parte. **Sin** puntos, niveles, rachas, logros ni recompensas: gamificar una encuesta sobre apuestas sería contradictorio.

## 4. Dirección — Adultos (18+)

**Sensación buscada:** seriedad, claridad y respeto por su tiempo. Un informe bien hecho que te consulta.

- **Tono visual:** editorial y sobrio, con una calidez sutil. Pensar en una publicación de divulgación bien diseñada, no en un formulario administrativo.
- **Color (propuesta de partida):** fondo claro cálido (tipo papel), texto en azul tinta, un acento verde azulado profundo y un secundario terracota para destacar. Evitar el dorado (remite a casino).
- **Tipografía (propuesta):** serif para los textos de las preguntas y los títulos (le da peso a la lectura) y sans legible para las opciones y la interfaz.
- **Transparencia como detalle de diseño:** varias preguntas tienen una nota de **«¿Por qué preguntamos esto?»** (campo `ayuda` en el contenido). Diseñarla como algo desplegable o secundario, siempre al alcance. En ingresos y deudas es clave para que respondan con sinceridad.
- **Bloque PGSI (9 preguntas con la misma escala):** tiene que sentirse ágil. Mantener las 4 respuestas **siempre en la misma posición** entre pantallas, para que la mano "aprenda" dónde están. Mostrar arriba el contexto «Pensando en los últimos 12 meses…».
- **Sliders de montos:** mostrar en grande el rango elegido en texto (por ejemplo, «Entre 1 y 2 salarios mínimos · $383.800 a $767.600»). Los montos en pesos se calculan con `smvmReferencia`.
- **Pantalla informativa de educación financiera:** al final, breve, como un cierre de valor para quien respondió.

## 5. Prohibido (en ambas)

- Cualquier estética de casino o de apuestas: fichas, dados, cartas, ruletas, tragamonedas, paño verde, dorados brillantes, luces.
- Recompensas o celebraciones: confeti, «¡Ganaste!», sonidos, trofeos, barras que "se llenan" con premio.
- Imágenes que estigmaticen: personas tristes, cadenas, esposas, billetes que se escapan, calaveras.
- Patrones oscuros: botones engañosos, apurar con temporizadores, «¿Seguro que querés salir?» insistente.
- Recursos externos que filtren datos de quien responde: nada de Google Fonts por CDN, analytics, píxeles de seguimiento ni widgets de terceros. **Las tipografías se descargan y se sirven desde nuestro propio servidor.**

## 6. Pantallas y estados a diseñar (para cada encuesta)

1. **Inicio:** título, texto de introducción y consentimiento (Sí / No).
2. **No participa:** mensaje breve de agradecimiento.
3. **Edad:** campo numérico. Estado de **edad fuera de rango** con un mensaje amable (no un error rojo).
4. **Título de sección:** título y descripción cortos, con transición hacia la primera pregunta.
5. **Componentes de pregunta:**
   - Opción única (en adultos, la carrera tiene las opciones **agrupadas**: Educación Inicial / Profesorados / Tecnicaturas).
   - Opción múltiple, con opciones **exclusivas** («Prefiero no responder», «Ninguno», «No sé», «No veo publicidad»): al marcarlas se desmarcan las demás, y viceversa.
   - Escala 1 a 5 con etiquetas en los extremos (adolescentes).
   - Escala 0 a 3 con etiquetas en cada punto (PGSI, adultos).
   - Slider de 5 pasos que **arranca sin valor marcado** (adultos). También puede resolverse como 5 botones segmentados, si en celular funciona mejor.
   - Texto libre con contador de caracteres (máximo 1000).
   - Pantalla informativa (educación financiera).
6. **Navegación:** botón «Atrás» siempre disponible. En opción única se puede avanzar solo al tocar (con una pausa breve para ver la selección); en múltiple, slider, número y texto hay botón «Siguiente». En adultos, «Siguiente» se habilita recién cuando la pregunta está respondida. En adolescentes, las opcionales tienen «Saltar».
7. **Progreso:** nombre de la sección y una barra discreta. Ojo: el total de preguntas cambia según las respuestas (ramas), así que la barra se calcula sobre el camino actual.
8. **Envío:** estado "enviando", estado de **error de envío** (sin conexión o servidor ocupado) con reintento **sin perder lo respondido**.
9. **Encuesta cerrada:** fuera de los días y horarios habilitados (19 al 23 de octubre, en franjas), con el mensaje de cuándo vuelve a abrir.
10. **Pantalla final:** agradecimiento y bloque de **líneas de ayuda**, visible pero calmo, sin tono alarmista:
    > Si vos o alguien cercano quiere hablar sobre el juego o las apuestas, hay ayuda gratuita y confidencial:
    > **0800-444-4000**: Provincia de Buenos Aires, las 24 horas.
    > **141**: SEDRONAR, línea nacional.
    >
    > _(Números PENDIENTES de verificación final.)_

## 7. Requisitos técnicos y de accesibilidad

- **Mobile first:** 360 a 430 px de ancho. En escritorio, una columna centrada de ~560 px.
- Zonas táctiles de **48 px** como mínimo. Texto base de **16 px** como mínimo (también evita el zoom automático de iOS en los campos).
- Contraste **WCAG AA** como mínimo, y todo usable con teclado y lector de pantalla.
- Respetar `prefers-reduced-motion`: sin animaciones para quien las desactivó.
- Liviano: tiene que cargar rápido con datos móviles y en un aula con wifi saturado.
- **Stack de implementación:** HTML, CSS y JavaScript sin framework, con los temas como variables CSS. Las preguntas **no se escriben en el HTML**: el frontend las pide a `GET /api/encuestas/:id` y las dibuja con los componentes. Por eso el diseño tiene que definir **componentes reutilizables**, no pantallas armadas a mano pregunta por pregunta.
- Contrato completo con el backend: `CONTRATO-FRONTEND.md`.
