// Encuesta de adolescentes (12 a 17 años).
// Fuente: docs/fuentes/adolescentes-formulario.pdf — se migra tal cual,
// salvo la validación de edad (12-17 en vez de 12-18).
//
// Las respuestas NO son obligatorias, salvo la edad (se necesita para validar el rango).

import { ACUERDO_1_A_5 } from './opciones-comunes.js';

const PREFIERO_NO_RESPONDER = {
  valor: 'prefiero_no_responder',
  texto: 'Prefiero no responder',
  exclusiva: true,
};

// La Sección 3 solo se muestra a quien dijo que alguna vez apostó.
const aposto = (r) =>
  r.aposto_alguna_vez === 'si_no_ultimo_anio' || r.aposto_alguna_vez === 'si_ultimo_anio';

export default {
  id: 'adolescentes',
  tabla: 'respuestas_adolescentes',
  titulo: '¿Cuándo el juego deja de ser un juego?',
  respuestasObligatorias: false,

  preguntas: [
    // Sección 2 — Sobre vos
    {
      id: 'edad',
      tipo: 'numero',
      texto: '¿Cuál es tu edad?',
      min: 12,
      max: 17,
      obligatoria: true,
    },
    {
      id: 'genero',
      tipo: 'unica',
      texto: '¿Cómo te percibís?',
      opciones: [
        { valor: 'varon', texto: 'Varón' },
        { valor: 'mujer', texto: 'Mujer' },
        { valor: 'otro', texto: 'Otro' },
        { valor: 'prefiero_no_decir', texto: 'Prefiero no decir' },
      ],
    },
    {
      id: 'aposto_alguna_vez',
      tipo: 'unica',
      texto: '¿Alguna vez apostaste plata o algo que vale plata (por ejemplo, skins)?',
      opciones: [
        { valor: 'si_no_ultimo_anio', texto: 'Sí, pero no en el último año' },
        { valor: 'si_ultimo_anio', texto: 'Sí, en el último año' },
        { valor: 'nunca', texto: 'Nunca' },
        { valor: 'prefiero_no_responder', texto: 'Prefiero no responder' },
      ],
    },

    // Sección 3 — Tu experiencia con las apuestas (solo rama "sí")
    {
      id: 'en_que_aposto',
      tipo: 'multiple',
      texto: '¿En qué apostaste?',
      visibleSi: aposto,
      opciones: [
        { valor: 'deportivas_online', texto: 'Apuestas deportivas online' },
        { valor: 'casino_online', texto: 'Casino online' },
        { valor: 'cartas', texto: 'Juego de cartas (póker, truco, etc.) por plata' },
        { valor: 'quiniela_loteria', texto: 'Quiniela, Lotería' },
        { valor: 'skins', texto: 'Skins o cajas de videojuegos' },
        { valor: 'otro', texto: 'Otro' },
        PREFIERO_NO_RESPONDER,
      ],
    },
    {
      id: 'frecuencia_ultimo_anio',
      tipo: 'unica',
      texto: 'En el último año, ¿con qué frecuencia apostaste?',
      visibleSi: aposto,
      opciones: [
        { valor: 'ninguna', texto: 'Ninguna vez en el último año' },
        { valor: 'menos_mensual', texto: 'Menos de una vez al mes' },
        { valor: 'algunas_mes', texto: 'Algunas veces al mes' },
        { valor: 'semanal', texto: 'Una vez por semana' },
        { valor: 'varias_semana', texto: 'Varias veces a la semana' },
        { valor: 'casi_diario', texto: 'Casi todos los días' },
        { valor: 'prefiero_no_responder', texto: 'Prefiero no responder' },
      ],
    },
    {
      id: 'motivo',
      tipo: 'multiple',
      texto: '¿Qué te llevó a apostar?',
      visibleSi: aposto,
      opciones: [
        { valor: 'diversion', texto: 'Diversión' },
        { valor: 'publicidad_influencers', texto: 'Publicidad o influencers' },
        { valor: 'curiosidad', texto: 'Curiosidad' },
        { valor: 'ganar_plata', texto: 'Ganar plata' },
        { valor: 'aburrimiento', texto: 'Aburrimiento' },
        { valor: 'amigos_familia', texto: 'Amigos o familia que también apuestan' },
        { valor: 'otro', texto: 'Otro' },
        PREFIERO_NO_RESPONDER,
      ],
    },
    {
      id: 'como_accedio',
      tipo: 'unica',
      texto: '¿Cómo accediste?',
      visibleSi: aposto,
      opciones: [
        { valor: 'cuenta_propia', texto: 'Con mi propia cuenta' },
        { valor: 'cuenta_ajena', texto: 'Con la cuenta o los datos de otra persona' },
        { valor: 'en_persona', texto: 'En persona' },
        { valor: 'prefiero_no_responder', texto: 'Prefiero no responder' },
      ],
    },

    // Sección 4 — Tu entorno y tu opinión (todos)
    {
      id: 'conoce_alguien',
      tipo: 'unica',
      texto: '¿Conocés a alguien de tu entorno que apueste?',
      opciones: [
        { valor: 'no', texto: 'No' },
        { valor: 'si_una', texto: 'Sí, conozco a una persona' },
        { valor: 'si_varias', texto: 'Sí, conozco a varias personas' },
        { valor: 'prefiero_no_responder', texto: 'Prefiero no responder' },
      ],
    },
    {
      id: 'frecuencia_publicidad',
      tipo: 'unica',
      texto: '¿Con qué frecuencia ves publicidad de apuestas?',
      opciones: [
        { valor: 'nunca_casi_nunca', texto: 'Nunca o casi nunca' },
        { valor: 'algunas_mes', texto: 'Algunas veces al mes' },
        { valor: 'algunas_semana', texto: 'Algunas veces por semana' },
        { valor: 'todos_los_dias', texto: 'Todos los días' },
        { valor: 'no_se', texto: 'No sé' },
      ],
    },
    {
      id: 'donde_publicidad',
      tipo: 'multiple',
      texto: '¿Dónde ves más publicidad?',
      opciones: [
        { valor: 'redes', texto: 'Redes sociales (Instagram, TikTok, Facebook, X, etc.)' },
        { valor: 'streamers', texto: 'Streamers y/o influencers' },
        { valor: 'tv', texto: 'TV' },
        { valor: 'videojuegos', texto: 'Videojuegos' },
        { valor: 'calle', texto: 'La calle' },
        { valor: 'no_veo', texto: 'No veo publicidad de apuestas', exclusiva: true },
      ],
    },
    {
      id: 'escala_perder_control',
      tipo: 'escala',
      texto: 'Es fácil perder el control con las apuestas online.',
      ...ACUERDO_1_A_5,
    },
    {
      id: 'escala_pasatiempo_inofensivo',
      tipo: 'escala',
      texto: 'Apostar online es un pasatiempo inofensivo.',
      ...ACUERDO_1_A_5,
    },
    {
      id: 'percepcion_por_que',
      tipo: 'multiple',
      texto: '¿Por qué creés que apuestan las personas de tu edad?',
      opciones: [
        { valor: 'diversion', texto: 'Diversión' },
        { valor: 'publicidad_influencers', texto: 'Publicidad o influencers' },
        { valor: 'curiosidad', texto: 'Curiosidad' },
        { valor: 'ganar_plata', texto: 'Ganar plata' },
        { valor: 'aburrimiento', texto: 'Aburrimiento' },
        { valor: 'amigos_familia', texto: 'Amigos o familia que también apuestan' },
        { valor: 'otro', texto: 'Otro' },
        { valor: 'no_se', texto: 'No sé', exclusiva: true },
      ],
    },
    {
      id: 'escala_ganar_plata',
      tipo: 'escala',
      texto: 'Alguien de mi edad puede ganar plata apostando.',
      ...ACUERDO_1_A_5,
    },

    // Sección 5 — Un breve espacio para leerte (opcional)
    {
      id: 'comentario',
      tipo: 'texto',
      texto:
        'Si querés contar algo o simplemente opinar, este es el lugar. ' +
        'No escribas nombres ni nada que te identifique.',
      maxLargo: 1000,
    },
  ],
};
