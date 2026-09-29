// Encuesta de adultos (18+).
// Fuentes: las preguntas del grupo de Administración Financiera (docs/fuentes/adultos-preguntas-1.jpeg
// y docs/fuentes/adultos-preguntas-2-no-apuesta.jpg), con lo que exige la consigna del instituto
// (medio de pago, monto por rangos, preguntas para quienes no apuestan). Ver
// docs/PLAN-encuesta-ludopatia.md, sección 4.
//
// Todas las respuestas son obligatorias. El grupo pidió las preguntas de a una, sin portadas
// de sección: las secciones quedan solo para agrupar los gráficos del dashboard.

import { SI_NO, SI_NO_NOSE } from './opciones-comunes.js';

const apuesta = { pregunta: 'apuesta', es: ['si'] };
const noApuesta = { pregunta: 'apuesta', es: ['no'] };

export default {
  id: 'adultos',
  tabla: 'respuestas_adultos',
  titulo: 'Encuesta sobre apuestas',
  respuestasObligatorias: true,
  portadasDeSeccion: false,

  pantallas: {
    intro: {
      titulo: '¿Apostás?',
      texto:
        'Somos estudiantes de la Tecnicatura en Administración Financiera y queremos saber cuántas ' +
        'personas del instituto apuestan. La encuesta es anónima: no pedimos nombre, DNI ni email, y ' +
        'nadie puede saber qué respondiste. No hay respuestas correctas ni incorrectas. Lleva unos ' +
        '3 minutos y todas las preguntas son obligatorias. Si no llegás al final, no se guarda nada.',
    },
    consentimiento: {
      pregunta: '¿Aceptás participar?',
      si: 'Sí, acepto',
      no: 'No, gracias',
      respuestaNo: 'Entendido. Gracias por tu tiempo.',
    },
    edadFueraDeRango: 'Esta encuesta es para personas de 18 años o más. Gracias por tu interés.',
    cierre: {
      titulo: '¡Gracias por participar!',
      texto: 'Tus respuestas se guardaron de forma anónima y van a formar parte de un análisis del grupo, sin datos individuales.',
    },
  },

  secciones: [
    { id: 'sobre_vos', titulo: 'Sobre vos' },
    { id: 'apuestas', titulo: 'Apuestas' },
    { id: 'habitos', titulo: 'Hábitos de apuesta' },
    { id: 'no_apuesta', titulo: 'Quienes no apuestan' },
    { id: 'educacion_financiera', titulo: 'Educación financiera' },
  ],

  preguntas: [
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
        { valor: 'educacion_inicial', texto: 'Educación Inicial', grupo: 'Profesorados' },
        { valor: 'prof_ingles', texto: 'Inglés', grupo: 'Profesorados' },
        { valor: 'prof_matematicas', texto: 'Matemáticas', grupo: 'Profesorados' },
        { valor: 'prof_literatura', texto: 'Literatura', grupo: 'Profesorados' },
        { valor: 'tec_enfermeria', texto: 'Enfermería', grupo: 'Tecnicaturas' },
        { valor: 'tec_trabajo_social', texto: 'Trabajo Social', grupo: 'Tecnicaturas' },
        { valor: 'tec_seguridad_higiene', texto: 'Seguridad e Higiene', grupo: 'Tecnicaturas' },
        { valor: 'tec_ciencia_datos_ia', texto: 'Ciencia de Datos e IA', grupo: 'Tecnicaturas' },
        { valor: 'tec_adm_financiera', texto: 'Administración Financiera', grupo: 'Tecnicaturas' },
        // PENDIENTE: el grupo escribió «ATM»; se asume Acompañante Terapéutico.
        { valor: 'tec_acompanante_terapeutico', texto: 'Acompañante Terapéutico', grupo: 'Tecnicaturas' },
        { valor: 'cufa', texto: 'CUFA (Curso de Formación Básica)', grupo: 'Otras' },
        // PENDIENTE: el grupo lista «Enfermería» y «Tecnicatura Enfermería» por separado.
        { valor: 'enfermeria', texto: 'Enfermería (otra)', grupo: 'Otras' },
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

    // Pregunta gatillo: separa a quienes apuestan de quienes no. Es el dato principal de la
    // encuesta. Dice «online o presenciales» porque después se pregunta por el casino
    // presencial: con «online» solamente, quien solo va al casino quedaría contado como «no».
    {
      id: 'apuesta',
      seccion: 'apuestas',
      tipo: 'unica',
      texto: '¿Realizás apuestas, ya sea online o presenciales?',
      opciones: SI_NO,
    },

    // Rama SÍ
    {
      id: 'frecuencia',
      seccion: 'habitos',
      tipo: 'unica',
      texto: '¿Con qué frecuencia apostás?',
      visibleSi: apuesta,
      opciones: [
        { valor: 'diariamente', texto: 'Diariamente' },
        { valor: 'semanalmente', texto: 'Semanalmente' },
        { valor: 'mensualmente', texto: 'Mensualmente' },
        { valor: 'menos_mensual', texto: 'Menos de una vez al mes' },
      ],
    },
    {
      id: 'tipo_apuesta',
      seccion: 'habitos',
      tipo: 'multiple',
      texto: '¿Qué tipo de apuestas hacés?',
      visibleSi: apuesta,
      opciones: [
        { valor: 'casino_presencial', texto: 'Casino presencial' },
        { valor: 'casino_online', texto: 'Casino online' },
        { valor: 'deportivas', texto: 'Apuestas deportivas' },
      ],
    },
    {
      id: 'motivo',
      seccion: 'habitos',
      tipo: 'multiple',
      texto: '¿Por qué apostás?',
      visibleSi: apuesta,
      opciones: [
        { valor: 'diversion', texto: 'Diversión' },
        { valor: 'ganar_dinero', texto: 'Ganar dinero' },
        { valor: 'influencia_social', texto: 'Influencia social' },
        { valor: 'otra', texto: 'Otra' },
      ],
    },
    {
      // En rangos (consigna del instituto): un número libre no se puede agrupar después.
      id: 'monto_por_vez',
      seccion: 'habitos',
      tipo: 'unica',
      texto: '¿Cuánto dinero solés apostar cada vez?',
      visibleSi: apuesta,
      opciones: [
        { valor: 'menos_10k', texto: 'Menos de $10.000' },
        { valor: 'entre_10k_50k', texto: 'Entre $10.000 y $50.000' },
        { valor: 'entre_50k_100k', texto: 'Entre $50.000 y $100.000' },
        { valor: 'mas_100k', texto: 'Más de $100.000' },
      ],
    },
    {
      // Lo exige la consigna del instituto.
      id: 'medio_pago',
      seccion: 'habitos',
      tipo: 'multiple',
      texto: '¿Con qué medio de pago apostás?',
      visibleSi: apuesta,
      opciones: [
        { valor: 'efectivo', texto: 'Efectivo' },
        { valor: 'debito', texto: 'Tarjeta de débito' },
        { valor: 'credito', texto: 'Tarjeta de crédito' },
        { valor: 'billetera_virtual', texto: 'Billetera virtual' },
        { valor: 'transferencia', texto: 'Transferencia bancaria' },
        { valor: 'otro', texto: 'Otro' },
      ],
    },
    {
      id: 'origen_dinero',
      seccion: 'habitos',
      tipo: 'multiple',
      texto: '¿De dónde proviene el dinero que usás para apostar?',
      visibleSi: apuesta,
      opciones: [
        { valor: 'sueldo', texto: 'Sueldo' },
        { valor: 'prestamo', texto: 'Préstamo' },
        { valor: 'planes_sociales', texto: 'Planes sociales' },
        { valor: 'otro', texto: 'Otro' },
      ],
    },
    {
      id: 'plataforma_legal',
      seccion: 'habitos',
      tipo: 'unica',
      texto: '¿Reconocés si apostás en una plataforma legal?',
      visibleSi: apuesta,
      opciones: SI_NO,
    },
    {
      id: 'incluyo_a_alguien',
      seccion: 'habitos',
      tipo: 'unica',
      texto: '¿Incluiste a alguien para que se involucre en el mundo de las apuestas?',
      visibleSi: apuesta,
      opciones: SI_NO_NOSE,
    },

    // Rama NO
    {
      id: 'penso_apostar',
      seccion: 'no_apuesta',
      tipo: 'unica',
      texto: '¿Pensaste alguna vez en hacerlo?',
      visibleSi: noApuesta,
      opciones: SI_NO,
    },
    {
      id: 'motivo_no_apuesta',
      seccion: 'no_apuesta',
      tipo: 'unica',
      texto: '¿Cuál es el motivo principal por el que no apostás?',
      visibleSi: noApuesta,
      opciones: [
        { valor: 'no_me_interesa', texto: 'No me interesa' },
        { valor: 'miedo_perder_plata', texto: 'Miedo a perder plata' },
        { valor: 'miedo_adiccion', texto: 'Miedo a volverme adicto/a' },
        { valor: 'no_se_como', texto: 'No sé cómo se hace' },
        { valor: 'otro', texto: 'Otro' },
      ],
    },
    {
      id: 'familiares_apuestan',
      seccion: 'no_apuesta',
      tipo: 'unica',
      texto: '¿Tenés familiares o amigos cercanos que apuesten regularmente?',
      visibleSi: noApuesta,
      opciones: SI_NO_NOSE,
    },
    {
      id: 'plata_facil',
      seccion: 'no_apuesta',
      tipo: 'unica',
      texto: '¿Creés que se puede generar plata fácil apostando?',
      visibleSi: noApuesta,
      opciones: [...SI_NO, { valor: 'a_veces', texto: 'A veces' }],
    },
    {
      id: 'canales_publicidad',
      seccion: 'no_apuesta',
      tipo: 'multiple',
      texto: '¿Por qué canales ves más publicidad de apuestas?',
      visibleSi: noApuesta,
      opciones: [
        { valor: 'redes', texto: 'Redes sociales' },
        { valor: 'videojuegos', texto: 'Videojuegos' },
        { valor: 'streamers', texto: 'Streamers y/o influencers' },
        { valor: 'ninguno', texto: 'Ninguno', exclusiva: true },
      ],
    },

    // Educación financiera, al final y para todos. «¿Sabés qué es?» va primero: quien no
    // sabe qué es no puede saber si la recibió.
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
  ],
};
