// Encuesta de adultos: textos de interfaz + arranque del motor.
// Las preguntas NO están acá: las entrega el backend (GET /api/encuestas/adultos).

import { Motor } from '/motor/motor.js';

// Textos de interfaz (no son preguntas). Los marcados PROPUESTA vienen del prototipo
// de Claude Design y falta revisarlos con el grupo (design/adultos/HANDOFF.md).
const UI = {
  atras: 'Atrás',
  siguiente: 'Siguiente',
  continuar: 'Continuar',
  saltar: 'Saltar', // no aparece: en adultos todas las preguntas son obligatorias
  enviar: 'Enviar', // PROPUESTA
  reintentar: 'Probar de nuevo', // PROPUESTA
  porque: '¿Por qué preguntamos esto?', // brief, sección 4
  pistaMultiple: 'Podés marcar más de una.', // PROPUESTA
  pregunta: 'Pregunta', // PROPUESTA: contador del bloque PGSI («Pregunta 3 de 9»)
  tramosVacio: 'Elegí el escalón que más se acerque.', // PROPUESTA
  tramosMenos: 'Menos', // PROPUESTA
  tramosMas: 'Más', // PROPUESTA
  pesos: {
    // PROPUESTA
    hasta: 'Hasta {monto}',
    masDe: 'Más de {monto}',
    entre: '{desde} a {hasta}',
    porMes: 'por mes',
  },
  enviando: 'Enviando tus respuestas…', // PROPUESTA
  errores: {
    // PROPUESTA
    'sin-conexion': {
      titulo: 'No pudimos enviar tus respuestas',
      texto: 'Parece que no hay conexión. Tus respuestas siguen guardadas en este dispositivo: probá de nuevo en un momento.',
    },
    ocupado: {
      titulo: 'Hay mucha gente respondiendo a la vez',
      texto: 'Esperá unos segundos y probá de nuevo. No se perdió ninguna respuesta.',
    },
    generico: {
      titulo: 'Algo salió mal',
      texto: 'No es por algo que hayas hecho. Probá de nuevo en un momento: tus respuestas siguen acá.',
    },
  },
  errorCarga: {
    titulo: 'No pudimos cargar la encuesta',
    texto: 'Revisá tu conexión a internet y probá de nuevo.',
  },
  cerrada: {
    // PROPUESTA
    titulo: 'La encuesta está cerrada en este momento',
    conFecha: 'Vuelve a abrir {cuando}. Podés entrar con el mismo QR.',
    finalizada: 'El período para responder ya terminó. Gracias por tu interés.',
  },
  ayuda: {
    // Números PENDIENTES de verificación final.
    intro: 'Si vos o alguien cercano quiere hablar sobre el juego o las apuestas, hay ayuda gratuita y confidencial:',
    lineas: [
      { numero: '0800-444-4000', href: 'tel:08004444000', descripcion: 'Provincia de Buenos Aires, las 24 horas.' },
      { numero: '141', href: 'tel:141', descripcion: 'SEDRONAR, línea nacional.' },
    ],
  },
};

new Motor({
  raiz: document.querySelector('.app'),
  id: 'adultos',
  ui: UI,
  // Cada pregunta en una tarjeta. Presentación y consentimiento en una sola pantalla (sin portada aparte).
  presentacion: { tarjeta: true, largoPreguntaLarga: 70, flechaAlEnviar: false, inicioConConsentimiento: true },
}).iniciar();
