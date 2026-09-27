// Construcción de elementos del DOM, compartida por las encuestas y el dashboard.
//
// Seguridad: todo texto se inserta como nodo de texto (nunca innerHTML), así un texto
// jamás puede ejecutar código. Los estilos dinámicos van por element.style, que la
// política de seguridad (CSP) del servidor permite; un atributo style="" no.

/** Crea un elemento: h('p', { class: 'x', on: { click }, estilo: { left: '4px' } }, 'texto', otroNodo) */
export function h(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'class') el.className = valor;
    else if (clave === 'on') for (const [evento, fn] of Object.entries(valor)) el.addEventListener(evento, fn);
    else if (clave === 'estilo') Object.assign(el.style, valor);
    else if (clave in el && typeof valor !== 'string') el[clave] = valor; // checked, disabled, etc.
    else el.setAttribute(clave, valor === true ? '' : valor);
  }
  // flat(Infinity): los hijos pueden venir en listas dentro de listas (p. ej. un map dentro de otro).
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}
