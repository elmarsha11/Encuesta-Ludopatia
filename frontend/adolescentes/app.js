// Encuesta de adolescentes: textos de interfaz + arranque del motor.
// Las preguntas NO están acá: las entrega el backend (GET /api/encuestas/adolescentes).

import { Motor } from '/motor/motor.js';

// Textos de interfaz (no son preguntas). Los marcados PROPUESTA vienen del prototipo
// de Claude Design y falta revisarlos con el grupo (design/adolescentes/HANDOFF.md).
const UI = {
  atras: 'Atrás',
  siguiente: 'Siguiente',
  saltar: 'Saltar',
  enviar: 'Enviar', // PROPUESTA
  reintentar: 'Probar de nuevo', // PROPUESTA
  pistaMultiple: 'Podés marcar más de una.', // PROPUESTA
  enviando: 'Enviando tus respuestas…', // PROPUESTA
  errores: {
    // PROPUESTA
    'sin-conexion': {
      titulo: 'No pudimos enviar tus respuestas',
      texto: 'Parece que no hay conexión. Tus respuestas siguen acá, no se perdió nada. Probá de nuevo en un momento.',
    },
    ocupado: {
      titulo: 'Hay mucha gente enviando a la vez',
      texto: 'Esperá unos segundos y probá de nuevo. Tus respuestas siguen acá, no se perdió nada.',
    },
    generico: {
      titulo: 'Algo salió mal',
      texto: 'No es por algo que hiciste. Probá de nuevo en un momento: tus respuestas siguen acá.',
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
    finalizada: 'El período para responder ya terminó. ¡Gracias por tu interés!',
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

new Motor({ raiz: document.querySelector('.app'), id: 'adolescentes', ui: UI }).iniciar();
