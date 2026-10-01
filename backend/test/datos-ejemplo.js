// Respuestas de ejemplo válidas, usadas como punto de partida en los tests.
// Cada test copia una y le cambia solo lo que quiere probar.

export const adultoQueApuesta = () => ({
  edad: 24,
  carrera: 'tec_adm_financiera',
  genero: 'femenino',
  situacion_laboral: 'relacion_dependencia',
  depende_economicamente: 'no',
  alguien_depende: 'si',
  apuesta: 'si',
  frecuencia: 'semanalmente',
  tipo_apuesta: ['casino_online'],
  motivo: ['diversion', 'ganar_dinero'],
  monto_por_vez: 'entre_10k_50k',
  medio_pago: ['billetera_virtual'],
  origen_dinero: ['sueldo'],
  plataforma_legal: 'no',
  incluyo_a_alguien: 'no_se',
  sabe_que_es_ef: 'si',
  recibio_ef: 'si',
  donde_recibio_ef: ['internet'],
  quiere_recibir_ef: 'si',
});

export const adultoQueNoApuesta = () => ({
  edad: 45,
  carrera: 'prof_literatura',
  genero: 'masculino',
  situacion_laboral: 'trabajo_propio',
  depende_economicamente: 'no',
  alguien_depende: 'no',
  apuesta: 'no',
  penso_apostar: 'no',
  motivo_no_apuesta: 'miedo_perder_plata',
  familiares_apuestan: 'no',
  plata_facil: 'no',
  canales_publicidad: ['ninguno'],
  sabe_que_es_ef: 'no',
  recibio_ef: 'no',
  quiere_recibir_ef: 'si',
});

export const adolescenteQueAposto = () => ({
  edad: 15,
  genero: 'varon',
  aposto_alguna_vez: 'si_ultimo_anio',
  en_que_aposto: ['skins', 'deportivas_online'],
  frecuencia_ultimo_anio: 'algunas_mes',
  motivo: ['amigos_familia'],
  como_accedio: 'cuenta_ajena',
  conoce_alguien: 'si_varias',
  frecuencia_publicidad: 'todos_los_dias',
  donde_publicidad: ['redes', 'streamers'],
  escala_perder_control: 4,
  escala_pasatiempo_inofensivo: 2,
  percepcion_por_que: ['ganar_plata', 'publicidad_influencers'],
  escala_ganar_plata: 3,
  comentario: '  Me parece bueno que pregunten esto.  ',
});

export const adolescenteQueNunca = () => ({
  edad: 13,
  aposto_alguna_vez: 'nunca',
});
