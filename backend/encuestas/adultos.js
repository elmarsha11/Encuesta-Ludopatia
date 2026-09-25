// Encuesta de adultos (18+).
// Fuentes: docs/fuentes/adultos-preguntas-1.jpeg y docs/fuentes/adultos-preguntas-2-no-apuesta.jpg,
// con los ajustes acordados en docs/PLAN-encuesta-ludopatia.md (sección 4).
//
// Todas las respuestas son obligatorias: no se avanza sin contestar.

import { SI_NO, SI_NO_NOSE } from './opciones-comunes.js';

// Salario Mínimo, Vital y Móvil usado como referencia en la pregunta de ingresos.
// Valor de septiembre de 2026. PENDIENTE: actualizar al valor vigente en octubre de 2026.
// En la base se guarda el PASO (1 a 5), no el monto: cambiar este número no altera los datos.
export const SMVM_REFERENCIA = 383_800;

const apostoUltimoAnio = { pregunta: 'aposto_12m', es: ['si'] };
const noApostoUltimoAnio = { pregunta: 'aposto_12m', es: ['no'] };

// PGSI — Problem Gambling Severity Index (9 ítems, últimos 12 meses).
// PENDIENTE: reemplazar por los ítems textuales de la validación española
// (López-González, Estévez y Griffiths, 2018). Esta es una traducción de trabajo.
const ITEMS_PGSI = [
  '¿Apostaste más de lo que realmente podías permitirte perder?',
  '¿Necesitaste apostar cantidades cada vez mayores para sentir la misma emoción?',
  '¿Volviste otro día para intentar recuperar el dinero que habías perdido?',
  '¿Pediste dinero prestado o vendiste algo para conseguir dinero para apostar?',
  '¿Sentiste que podrías tener un problema con el juego?',
  '¿El juego te causó problemas de salud, incluido estrés o ansiedad?',
  '¿Otras personas criticaron tus apuestas o te dijeron que tenías un problema con el juego, más allá de que vos creyeras que era cierto o no?',
  '¿El juego te causó problemas económicos a vos o a tu hogar?',
  '¿Te sentiste culpable por la forma en que apostás o por lo que pasa cuando apostás?',
];

const preguntasPgsi = ITEMS_PGSI.map((texto, i) => ({
  id: `pgsi_${i + 1}`,
  seccion: 'pgsi',
  tipo: 'escala',
  texto,
  min: 0,
  max: 3,
  etiquetas: { 0: 'Nunca', 1: 'A veces', 2: 'La mayoría de las veces', 3: 'Casi siempre' },
  visibleSi: apostoUltimoAnio,
}));

// Categorías oficiales del PGSI según el puntaje total (0 a 27).
export function categoriaPgsi(total) {
  if (total === 0) return 'sin_riesgo';
  if (total <= 2) return 'riesgo_bajo';
  if (total <= 7) return 'riesgo_moderado';
  return 'juego_problematico';
}

export default {
  id: 'adultos',
  tabla: 'respuestas_adultos',
  titulo: 'Apuestas, dinero y decisiones',
  respuestasObligatorias: true,
  smvmReferencia: SMVM_REFERENCIA,

  // Textos de las pantallas que no son preguntas.
  // PENDIENTE: revisión y aprobación del grupo de Administración Financiera.
  pantallas: {
    intro: {
      titulo: 'Apuestas, dinero y decisiones',
      texto:
        'Somos estudiantes de la Tecnicatura en Administración Financiera y estamos investigando ' +
        'cómo se relacionan las apuestas con la situación económica, la publicidad y la educación ' +
        'financiera. La encuesta es anónima: no pedimos nombre, DNI ni email, y nadie puede saber ' +
        'qué respondiste vos. No hay respuestas correctas ni incorrectas y no buscamos juzgar a nadie. ' +
        'Lleva menos de 5 minutos. Todas las preguntas son obligatorias, pero podés abandonar la ' +
        'encuesta cuando quieras: si no llegás al final, no se guarda nada. Te pedimos que respondas ' +
        'con honestidad.',
    },
    consentimiento: {
      pregunta: '¿Aceptás participar?',
      si: 'Sí, acepto',
      no: 'No, gracias',
      respuestaNo: 'Entendido. Gracias por tu tiempo.',
    },
    edadFueraDeRango: 'Esta encuesta es para personas de 18 años o más. Gracias por tu interés.',
    cierre: {
      titulo: 'Gracias por tu participación',
      texto:
        'Tus respuestas se guardaron de forma anónima y van a formar parte de un análisis ' +
        'estadístico del grupo, sin datos individuales.',
    },
  },

  secciones: [
    {
      id: 'sobre_vos',
      titulo: 'Sobre vos',
      descripcion: 'Datos generales para describir al grupo que responde. Nada de esto te identifica.',
    },
    {
      id: 'apuestas',
      titulo: 'Apuestas',
      descripcion: 'Cuando decimos "apostar" hablamos de jugar dinero en casinos, apuestas deportivas, online o de forma presencial.',
    },
    {
      id: 'habitos',
      titulo: 'Tus hábitos de apuesta',
      descripcion: 'Estas preguntas son solo para quienes apostaron en el último año.',
    },
    {
      id: 'pgsi',
      titulo: 'Pensando en los últimos 12 meses…',
      descripcion:
        'Estas 9 preguntas forman parte de un cuestionario usado internacionalmente (PGSI). ' +
        'Elegí la opción que mejor describa tu experiencia.',
    },
    {
      id: 'mirada',
      titulo: 'Tu mirada sobre las apuestas',
      descripcion: 'Estas preguntas son para quienes no apostaron en el último año.',
    },
    {
      id: 'entorno',
      titulo: 'Tu entorno y la publicidad',
      descripcion: 'Estas preguntas son para todos, hayas apostado o no.',
    },
    {
      id: 'educacion_financiera',
      titulo: 'Educación financiera',
      descripcion: 'Una última sección, corta.',
    },
  ],

  preguntas: [
    // Bloque 1 — Sobre vos
    {
      id: 'edad',
      seccion: 'sobre_vos',
      tipo: 'numero',
      texto: '¿Qué edad tenés?',
      min: 18,
      max: 99,
    },
    {
      id: 'carrera',
      seccion: 'sobre_vos',
      tipo: 'unica',
      texto: '¿Qué carrera estás cursando?',
      opciones: [
        { valor: 'educacion_inicial', texto: 'Educación Inicial', grupo: 'Educación Inicial' },
        { valor: 'prof_ingles', texto: 'Inglés', grupo: 'Profesorados' },
        { valor: 'prof_matematicas', texto: 'Matemáticas', grupo: 'Profesorados' },
        { valor: 'prof_literatura', texto: 'Literatura', grupo: 'Profesorados' },
        { valor: 'tec_ciencia_datos_ia', texto: 'Ciencia de Datos e IA', grupo: 'Tecnicaturas' },
        { valor: 'tec_seguridad_higiene', texto: 'Seguridad e Higiene', grupo: 'Tecnicaturas' },
        { valor: 'tec_adm_financiera', texto: 'Administración Financiera', grupo: 'Tecnicaturas' },
        { valor: 'tec_acompanante_terapeutico', texto: 'Acompañante Terapéutico', grupo: 'Tecnicaturas' },
        { valor: 'tec_trabajo_social', texto: 'Trabajo Social', grupo: 'Tecnicaturas' },
      ],
    },
    {
      id: 'genero',
      seccion: 'sobre_vos',
      tipo: 'unica',
      texto: '¿Con qué género te identificás?',
      opciones: [
        { valor: 'masculino', texto: 'Masculino' },
        { valor: 'femenino', texto: 'Femenino' },
        { valor: 'otro', texto: 'Otro' },
        { valor: 'prefiero_no_decir', texto: 'Prefiero no decir' },
      ],
    },
    {
      id: 'situacion_laboral',
      seccion: 'sobre_vos',
      tipo: 'unica',
      texto: '¿En qué condición laboral te encontrás?',
      opciones: [
        { valor: 'trabajo_propio', texto: 'Trabajo por cuenta propia' },
        { valor: 'relacion_dependencia', texto: 'Trabajo en relación de dependencia' },
        { valor: 'no_trabajo', texto: 'No trabajo' },
      ],
    },
    {
      id: 'depende_economicamente',
      seccion: 'sobre_vos',
      tipo: 'unica',
      texto: '¿Dependés económicamente de alguien?',
      opciones: SI_NO,
    },
    {
      id: 'alguien_depende',
      seccion: 'sobre_vos',
      tipo: 'unica',
      texto: '¿Alguien depende económicamente de vos?',
      opciones: SI_NO,
    },
    {
      id: 'ingresos_hogar',
      seccion: 'sobre_vos',
      tipo: 'escala',
      presentacion: 'slider',
      texto: '¿Cuánto dinero ingresa por mes en tu hogar, aproximadamente?',
      ayuda:
        'Sumá todos los ingresos de las personas con las que vivís. Lo usamos para ver si la ' +
        'situación económica se relaciona con las apuestas; una aproximación alcanza.',
      min: 1,
      max: 5,
      // El frontend agrega el equivalente en pesos usando SMVM_REFERENCIA.
      etiquetas: {
        1: 'Sin ingresos o hasta 1 salario mínimo',
        2: 'Entre 1 y 2 salarios mínimos',
        3: 'Entre 2 y 3 salarios mínimos',
        4: 'Entre 3 y 5 salarios mínimos',
        5: 'Más de 5 salarios mínimos',
      },
    },
    {
      id: 'tiene_deudas',
      seccion: 'sobre_vos',
      tipo: 'unica',
      texto: '¿Tenés deudas actualmente?',
      ayuda: 'Por ejemplo: préstamos, tarjeta de crédito impaga, cuotas atrasadas o dinero que le debés a alguien.',
      opciones: SI_NO,
    },
    {
      id: 'deuda_relativa',
      seccion: 'sobre_vos',
      tipo: 'escala',
      presentacion: 'slider',
      texto: '¿Cuánto representa tu deuda comparada con lo que ingresa por mes en tu hogar?',
      min: 1,
      max: 5,
      etiquetas: {
        1: 'Menos de medio mes de ingresos',
        2: 'Entre medio mes y 1 mes',
        3: 'Entre 1 y 3 meses',
        4: 'Entre 3 y 6 meses',
        5: 'Más de 6 meses de ingresos',
      },
      visibleSi: { pregunta: 'tiene_deudas', es: ['si'] },
    },

    // Bloque 2 — Pregunta gatillo
    {
      id: 'aposto_12m',
      seccion: 'apuestas',
      tipo: 'unica',
      texto:
        'En los últimos 12 meses, ¿apostaste dinero, ya sea online o de forma presencial?',
      opciones: SI_NO,
    },

    // Rama SÍ — Tus hábitos de apuesta
    {
      id: 'frecuencia',
      seccion: 'habitos',
      tipo: 'unica',
      texto: '¿Con qué frecuencia apostás?',
      visibleSi: apostoUltimoAnio,
      opciones: [
        { valor: 'menos_mensual', texto: 'Menos de una vez al mes' },
        { valor: 'algunas_mes', texto: 'Algunas veces al mes' },
        { valor: 'semanal', texto: 'Una vez por semana' },
        { valor: 'varias_semana', texto: 'Varias veces por semana' },
        { valor: 'casi_diario', texto: 'Casi todos los días' },
      ],
    },
    {
      id: 'motivo',
      seccion: 'habitos',
      tipo: 'multiple',
      texto: '¿Por qué apostás?',
      visibleSi: apostoUltimoAnio,
      opciones: [
        { valor: 'diversion', texto: 'Diversión' },
        { valor: 'ganar_dinero', texto: 'Ganar dinero' },
        { valor: 'influencia_social', texto: 'Influencia social' },
        { valor: 'otra', texto: 'Otra' },
      ],
    },
    {
      id: 'tipo_apuesta',
      seccion: 'habitos',
      tipo: 'multiple',
      texto: '¿Qué tipo de apuestas hacés?',
      visibleSi: apostoUltimoAnio,
      opciones: [
        { valor: 'casino_presencial', texto: 'Casino presencial' },
        { valor: 'casino_online', texto: 'Casino online' },
        { valor: 'deportivas', texto: 'Apuestas deportivas' },
      ],
    },
    {
      id: 'plataforma_legal',
      seccion: 'habitos',
      tipo: 'unica',
      texto: '¿Reconocés si apostás en una plataforma legal?',
      visibleSi: apostoUltimoAnio,
      opciones: SI_NO,
    },
    {
      id: 'incluyo_a_alguien',
      seccion: 'habitos',
      tipo: 'unica',
      texto: '¿Incluiste a alguien para que se involucre en el mundo de las apuestas?',
      visibleSi: apostoUltimoAnio,
      opciones: SI_NO_NOSE,
    },
    {
      id: 'monto_por_vez',
      seccion: 'habitos',
      tipo: 'escala',
      presentacion: 'slider',
      texto: '¿Cuánto dinero solés apostar cada vez?',
      visibleSi: apostoUltimoAnio,
      min: 1,
      max: 5,
      etiquetas: {
        1: 'Menos de $10.000',
        2: 'Entre $10.000 y $25.000',
        3: 'Entre $25.000 y $50.000',
        4: 'Entre $50.000 y $100.000',
        5: 'Más de $100.000',
      },
    },
    {
      id: 'origen_dinero',
      seccion: 'habitos',
      tipo: 'multiple',
      texto: '¿De dónde proviene el dinero que usás para apostar?',
      visibleSi: apostoUltimoAnio,
      opciones: [
        { valor: 'sueldo', texto: 'Sueldo' },
        { valor: 'prestamo', texto: 'Préstamo' },
        { valor: 'planes_sociales', texto: 'Planes sociales' },
        { valor: 'otro', texto: 'Otro' },
      ],
    },
    ...preguntasPgsi,

    // Rama NO — Tu mirada sobre las apuestas
    {
      id: 'penso_apostar',
      seccion: 'mirada',
      tipo: 'unica',
      texto: '¿Pensaste alguna vez en hacerlo?',
      visibleSi: noApostoUltimoAnio,
      opciones: SI_NO,
    },
    {
      id: 'motivo_no_apuesta',
      seccion: 'mirada',
      tipo: 'unica',
      texto: '¿Cuál es el motivo principal por el que no apostás?',
      visibleSi: noApostoUltimoAnio,
      opciones: [
        { valor: 'no_me_interesa', texto: 'No me interesa' },
        { valor: 'miedo_perder_plata', texto: 'Miedo a perder plata' },
        { valor: 'miedo_adiccion', texto: 'Miedo a volverme adicto/a' },
        { valor: 'no_se_como', texto: 'No sé cómo se hace' },
        { valor: 'otro', texto: 'Otro' },
      ],
    },

    // Bloque 3 — Entorno y publicidad (todos)
    {
      id: 'familiares_apuestan',
      seccion: 'entorno',
      tipo: 'unica',
      texto: '¿Tenés familiares o amigos cercanos que apuesten regularmente?',
      opciones: SI_NO_NOSE,
    },
    {
      id: 'plata_facil',
      seccion: 'entorno',
      tipo: 'unica',
      texto: '¿Creés que se puede generar plata fácil apostando?',
      opciones: [...SI_NO, { valor: 'a_veces', texto: 'A veces' }],
    },
    {
      id: 'canales_publicidad',
      seccion: 'entorno',
      tipo: 'multiple',
      texto: '¿Por qué canales ves más publicidad de apuestas?',
      opciones: [
        { valor: 'redes', texto: 'Redes sociales' },
        { valor: 'videojuegos', texto: 'Videojuegos' },
        { valor: 'streamers', texto: 'Streamers y/o influencers' },
        { valor: 'tv', texto: 'TV' },
        { valor: 'calle', texto: 'La calle' },
        { valor: 'ninguno', texto: 'Ninguno', exclusiva: true },
      ],
    },

    // Bloque 4 — Educación financiera
    {
      id: 'sabe_que_es_ef',
      seccion: 'educacion_financiera',
      tipo: 'unica',
      texto: '¿Sabés qué es la educación financiera?',
      opciones: SI_NO,
    },
    {
      id: 'recibio_ef',
      seccion: 'educacion_financiera',
      tipo: 'unica',
      texto: '¿Recibiste educación financiera?',
      opciones: SI_NO_NOSE,
    },
    {
      id: 'donde_recibio_ef',
      seccion: 'educacion_financiera',
      tipo: 'multiple',
      texto: '¿Dónde la recibiste?',
      visibleSi: { pregunta: 'recibio_ef', es: ['si'] },
      opciones: [
        { valor: 'casa', texto: 'En casa' },
        { valor: 'escuela', texto: 'En la escuela' },
        { valor: 'internet', texto: 'En internet' },
      ],
    },
    {
      id: 'quiere_recibir_ef',
      seccion: 'educacion_financiera',
      tipo: 'unica',
      texto: '¿Te gustaría recibirla?',
      opciones: SI_NO,
    },
    {
      // Pantalla informativa: no es una pregunta y no se guarda.
      // PENDIENTE: borrador de Claude; lo revisa y aprueba el grupo.
      id: 'info_ef',
      seccion: 'educacion_financiera',
      tipo: 'info',
      titulo: '¿Qué es la educación financiera?',
      texto:
        'Es el conjunto de conocimientos y hábitos que nos ayudan a manejar el dinero: armar un ' +
        'presupuesto, ahorrar, entender cuánto cuesta realmente un crédito o una compra en cuotas, ' +
        'y tomar decisiones informadas antes de gastar, endeudarnos o invertir. No se trata de ' +
        'tener mucho dinero, sino de decidir mejor con el que tenemos.',
    },
  ],

  // Columnas que no responde la persona: las calcula el backend a partir de las respuestas.
  columnasCalculadas: [
    { nombre: 'pgsi_total', sql: 'INTEGER CHECK (pgsi_total BETWEEN 0 AND 27)' },
    {
      nombre: 'pgsi_categoria',
      sql: "TEXT CHECK (pgsi_categoria IN ('sin_riesgo', 'riesgo_bajo', 'riesgo_moderado', 'juego_problematico'))",
    },
  ],

  calcular(r) {
    if (r.aposto_12m !== 'si') return { pgsi_total: null, pgsi_categoria: null };
    const total = preguntasPgsi.reduce((suma, p) => suma + r[p.id], 0);
    return { pgsi_total: total, pgsi_categoria: categoriaPgsi(total) };
  },
};
