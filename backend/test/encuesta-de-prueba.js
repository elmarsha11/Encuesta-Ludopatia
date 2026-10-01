// Encuesta inventada, solo para tests. Reúne las formas de pregunta que el motor sabe
// dibujar y validar aunque hoy ninguna encuesta real las use (tramos con equivalente en
// pesos, «Prefiero no responder» en una escala, bloque de frecuencia, pantalla informativa,
// opciones agrupadas). Así esas piezas siguen probadas sin depender de las preguntas reales.

import { SI_NO, PREFIERO_NO_RESPONDER } from '../encuestas/opciones-comunes.js';

const siUsa = { pregunta: 'usa', es: ['si'] };

export default {
  id: 'prueba',
  tabla: 'respuestas_prueba',
  titulo: 'Encuesta de prueba',
  respuestasObligatorias: true,
  smvmReferencia: 383_800,
  pantallas: {},
  secciones: [
    { id: 'datos', titulo: 'Datos' },
    { id: 'frecuencia', titulo: 'Frecuencia' },
    { id: 'final', titulo: 'Final' },
  ],
  preguntas: [
    { id: 'edad', seccion: 'datos', tipo: 'numero', texto: 'Edad', min: 18, max: 99 },
    {
      id: 'carrera',
      seccion: 'datos',
      tipo: 'unica',
      texto: 'Carrera',
      opciones: [
        { valor: 'inicial', texto: 'Educación Inicial', grupo: 'Educación Inicial' },
        { valor: 'ingles', texto: 'Inglés', grupo: 'Profesorados' },
        { valor: 'matematica', texto: 'Matemática', grupo: 'Profesorados' },
        { valor: 'datos', texto: 'Ciencia de Datos', grupo: 'Tecnicaturas' },
      ],
    },
    {
      id: 'ingresos',
      seccion: 'datos',
      tipo: 'escala',
      presentacion: 'slider',
      texto: 'Ingresos',
      min: 1,
      max: 5,
      rangosSmvm: { 1: [0, 1], 2: [1, 2], 3: [2, 3], 4: [3, 5], 5: [5, null] },
      opcionNoResponde: PREFIERO_NO_RESPONDER,
      etiquetas: { 1: 'Uno', 2: 'Dos', 3: 'Tres', 4: 'Cuatro', 5: 'Cinco' },
    },
    {
      id: 'deuda',
      seccion: 'datos',
      tipo: 'escala',
      presentacion: 'slider',
      texto: 'Deuda',
      min: 1,
      max: 3,
      etiquetas: { 1: 'Poca', 2: 'Media', 3: 'Mucha' },
    },
    { id: 'usa', seccion: 'datos', tipo: 'unica', texto: '¿Usa?', opciones: [...SI_NO, PREFIERO_NO_RESPONDER] },
    ...[1, 2, 3].map((n) => ({
      id: `frec_${n}`,
      seccion: 'frecuencia',
      tipo: 'escala',
      texto: `Frecuencia ${n}`,
      min: 0,
      max: 3,
      etiquetas: { 0: 'Nunca', 1: 'A veces', 2: 'Seguido', 3: 'Siempre' },
      visibleSi: siUsa,
    })),
    { id: 'info', seccion: 'final', tipo: 'info', titulo: 'Un dato', texto: 'Texto informativo.' },
  ],
};
