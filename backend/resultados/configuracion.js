// Qué muestra el dashboard de cada encuesta además de una distribución por pregunta
// (esa parte sale sola de la definición de la encuesta).
//
// VARIABLES: agrupan las respuestas de una columna en pocos niveles, porque con 70 a 100
// respuestas un cruce con muchas categorías queda lleno de celdas ocultas. Quien no
// encaja en ningún nivel («No sé», «Prefiero no responder») queda fuera de ESE cruce.
//
// CRUCES: «factor» son las filas y «resultado» las columnas. Se leen por fila:
// «entre quienes trabajan, X% apuesta». Muestran asociaciones,
// no causas (docs/PLAN-encuesta-ludopatia.md, 8.6).

// Un nivel: los valores de la columna que incluye, o un rango numérico [desde, hasta].
const nivel = (valor, texto, incluye) => ({ valor, texto, incluye });
const rango = (valor, texto, desde, hasta) => ({ valor, texto, rango: [desde, hasta] });
const siNo = (columna, textoSi, textoNo) => ({
  columna,
  niveles: [nivel('si', textoSi, ['si']), nivel('no', textoNo, ['no'])],
});

export const CONFIGURACION = {
  adultos: {
    // Edad agrupada también en la distribución simple: una edad exacta identifica.
    gruposEdad: [rango('18_24', '18 a 24', 18, 24), rango('25_34', '25 a 34', 25, 34), rango('35_mas', '35 o más', 35, 99)],
    calculadas: [],
    variables: {
      aposto: { texto: 'Apuesta', ...siNo('apuesta', 'Apuesta', 'No apuesta') },
      edad: {
        texto: 'Edad',
        columna: 'edad',
        niveles: [rango('18_24', '18 a 24', 18, 24), rango('25_34', '25 a 34', 25, 34), rango('35_mas', '35 o más', 35, 99)],
      },
      genero: {
        texto: 'Género',
        columna: 'genero',
        niveles: [nivel('masculino', 'Masculino', ['masculino']), nivel('femenino', 'Femenino', ['femenino'])],
      },
      carrera: {
        texto: 'Carrera',
        columna: 'carrera',
        niveles: [
          nivel('profesorados', 'Profesorados', ['educacion_inicial', 'prof_ingles', 'prof_matematicas', 'prof_literatura']),
          nivel('tecnicaturas', 'Tecnicaturas', [
            'tec_enfermeria',
            'tec_trabajo_social',
            'tec_seguridad_higiene',
            'tec_ciencia_datos_ia',
            'tec_adm_financiera',
            'tec_acompanante_terapeutico',
          ]),
          nivel('otras', 'Otras', ['cufa', 'enfermeria']),
        ],
      },
      trabajo: {
        texto: 'Condición laboral',
        columna: 'situacion_laboral',
        niveles: [
          nivel('trabaja', 'Trabaja', ['trabajo_propio', 'relacion_dependencia']),
          nivel('no_trabaja', 'No trabaja', ['no_trabajo']),
        ],
      },
      depende: { texto: 'Dependencia económica', ...siNo('depende_economicamente', 'Depende de alguien', 'No depende de nadie') },
      dependientes: { texto: 'Personas a cargo', ...siNo('alguien_depende', 'Alguien depende de su ingreso', 'Nadie depende de su ingreso') },
      recibio_ef: { texto: 'Educación financiera', ...siNo('recibio_ef', 'Recibió educación financiera', 'No recibió') },
      sabe_ef: { texto: 'Conocimiento de educación financiera', ...siNo('sabe_que_es_ef', 'Sabe qué es', 'No sabe qué es') },
    },
    cruces: [
      { id: 'aposto_edad', seccion: 'Quiénes apuestan', factor: 'edad', resultado: 'aposto' },
      { id: 'aposto_genero', seccion: 'Quiénes apuestan', factor: 'genero', resultado: 'aposto' },
      { id: 'aposto_carrera', seccion: 'Quiénes apuestan', factor: 'carrera', resultado: 'aposto' },
      { id: 'aposto_trabajo', seccion: 'Situación económica', factor: 'trabajo', resultado: 'aposto' },
      { id: 'aposto_depende', seccion: 'Situación económica', factor: 'depende', resultado: 'aposto' },
      { id: 'aposto_dependientes', seccion: 'Situación económica', factor: 'dependientes', resultado: 'aposto' },
      { id: 'aposto_sabe_ef', seccion: 'Educación financiera', factor: 'sabe_ef', resultado: 'aposto' },
      { id: 'aposto_recibio_ef', seccion: 'Educación financiera', factor: 'recibio_ef', resultado: 'aposto' },
    ],
  },

  adolescentes: {
    calculadas: [],
    variables: {
      aposto: {
        texto: 'Apostó alguna vez',
        columna: 'aposto_alguna_vez',
        niveles: [
          nivel('si', 'Apostó alguna vez', ['si_no_ultimo_anio', 'si_ultimo_anio']),
          nivel('no', 'Nunca apostó', ['nunca']),
        ],
      },
      edad: { texto: 'Edad', columna: 'edad', niveles: [rango('12_14', '12 a 14', 12, 14), rango('15_17', '15 a 17', 15, 17)] },
      genero: {
        texto: 'Género',
        columna: 'genero',
        niveles: [nivel('varon', 'Varón', ['varon']), nivel('mujer', 'Mujer', ['mujer'])],
      },
      conoce: {
        texto: 'Entorno',
        columna: 'conoce_alguien',
        niveles: [nivel('si', 'Conoce a alguien que apuesta', ['si_una', 'si_varias']), nivel('no', 'No conoce a nadie', ['no'])],
      },
      publicidad: {
        texto: 'Publicidad',
        columna: 'frecuencia_publicidad',
        niveles: [
          nivel('frecuente', 'Ve publicidad todas las semanas o más', ['algunas_semana', 'todos_los_dias']),
          nivel('poca', 'Ve publicidad menos seguido', ['nunca_casi_nunca', 'algunas_mes']),
        ],
      },
    },
    cruces: [
      { id: 'aposto_edad', seccion: 'Quiénes responden', factor: 'edad', resultado: 'aposto' },
      { id: 'aposto_genero', seccion: 'Quiénes responden', factor: 'genero', resultado: 'aposto' },
      { id: 'aposto_conoce', seccion: 'Entorno y publicidad', factor: 'conoce', resultado: 'aposto' },
      { id: 'aposto_publicidad', seccion: 'Entorno y publicidad', factor: 'publicidad', resultado: 'aposto' },
    ],
  },
};
