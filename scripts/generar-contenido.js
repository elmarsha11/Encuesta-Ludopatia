// Genera docs/diseno/contenido-<encuesta>.md a partir de las definiciones.
// Son documentos legibles (para Claude Design y para revisión del grupo) con
// todas las pantallas, preguntas, opciones y ramas. Uso: npm run contenido

import { writeFileSync } from 'node:fs';
import { ENCUESTAS } from '../backend/encuestas/index.js';

const TIPOS = {
  numero: 'Número',
  unica: 'Opción única',
  multiple: 'Opción múltiple (se puede marcar más de una)',
  escala: 'Escala',
  texto: 'Texto libre',
  info: 'Pantalla informativa (no se responde)',
};

function describirCondicion(encuesta, condicion) {
  const origen = encuesta.preguntas.find((p) => p.id === condicion.pregunta);
  const textos = condicion.es.map((v) => `«${origen.opciones.find((o) => o.valor === v).texto}»`);
  return `solo si en «${origen.texto}» respondió ${textos.join(' o ')}`;
}

function describirPregunta(encuesta, p, numero) {
  const lineas = [];
  const titulo = p.tipo === 'info' ? p.titulo : p.texto;
  lineas.push(`#### ${numero}. ${titulo}`, '');
  if (p.tipo === 'info') lineas.push(p.texto, '');

  const detalles = [`**Tipo:** ${TIPOS[p.tipo]}`];
  if (p.presentacion === 'slider') detalles.push('**Presentación:** slider de 5 pasos, arranca sin valor marcado');
  if (p.tipo !== 'info') {
    const obligatoria = p.obligatoria ?? encuesta.respuestasObligatorias;
    detalles.push(obligatoria ? '**Obligatoria**' : '**Opcional**');
  }
  if (p.visibleSi) detalles.push(`**Se muestra** ${describirCondicion(encuesta, p.visibleSi)}`);
  if (p.tipo === 'numero') detalles.push(`**Rango:** ${p.min} a ${p.max}`);
  if (p.tipo === 'texto') detalles.push(`**Máximo:** ${p.maxLargo} caracteres`);
  lineas.push(detalles.join(' · '), '');

  if (p.ayuda) lineas.push(`> Nota de ayuda: ${p.ayuda}`, '');

  if (p.opciones) {
    for (const o of p.opciones) {
      const extra = [o.grupo && `grupo: ${o.grupo}`, o.exclusiva && 'excluye a las demás'].filter(Boolean);
      lineas.push(`- ${o.texto}${extra.length ? ` _(${extra.join(', ')})_` : ''}`);
    }
    lineas.push('');
  }
  if (p.tipo === 'escala') {
    for (let v = p.min; v <= p.max; v++) {
      lineas.push(`- ${v}${p.etiquetas?.[v] ? `: ${p.etiquetas[v]}` : ''}`);
    }
    lineas.push('');
  }
  return lineas.join('\n');
}

export function contenidoDe(encuesta) {
  const { pantallas } = encuesta;
  const partes = [
    `# Contenido — encuesta de ${encuesta.id}`,
    '',
    '> ARCHIVO GENERADO por `npm run contenido` a partir de `backend/encuestas/`. No editar a mano.',
    '',
    `**Respuestas:** ${encuesta.respuestasObligatorias ? 'todas obligatorias' : 'opcionales salvo que se indique'}.`,
    '',
    '## Pantalla de inicio',
    '',
    `### ${pantallas.intro.titulo}`,
    '',
    pantallas.intro.texto,
    '',
    ...(pantallas.intro.puntos ?? []).map((p) => `- **${p.destacado}:** ${p.texto}`),
    ...(pantallas.intro.puntos ? [''] : []),
    ...(pantallas.intro.cierre ? [pantallas.intro.cierre, ''] : []),
    `**${pantallas.consentimiento.pregunta}** — botones: «${pantallas.consentimiento.si}» / «${pantallas.consentimiento.no}»`,
    '',
    `Si elige «${pantallas.consentimiento.no}»: _${pantallas.consentimiento.respuestaNo}_ (no se guarda nada).`,
    '',
    `Si la edad está fuera de rango: _${pantallas.edadFueraDeRango}_`,
    '',
  ];

  let numero = 0;
  for (const seccion of encuesta.secciones) {
    const preguntas = encuesta.preguntas.filter((p) => p.seccion === seccion.id);
    partes.push(`## ${seccion.titulo}`, '', `_${seccion.descripcion}_`, '');
    for (const p of preguntas) partes.push(describirPregunta(encuesta, p, ++numero));
  }

  partes.push(
    '## Pantalla final',
    '',
    `### ${pantallas.cierre.titulo}`,
    '',
    pantallas.cierre.texto,
    '',
    '_Seguida del bloque de líneas de ayuda (ver docs/diseno/BRIEF-DISENO.md)._',
    '',
  );
  return partes.join('\n');
}

// Solo escribe los archivos si se ejecuta como script (no cuando lo importa un test).
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const encuesta of Object.values(ENCUESTAS)) {
    const destino = new URL(`../docs/diseno/contenido-${encuesta.id}.md`, import.meta.url);
    writeFileSync(destino, contenidoDe(encuesta));
    console.log(`docs/diseno/contenido-${encuesta.id}.md actualizado`);
  }
}
