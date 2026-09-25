-- ARCHIVO GENERADO por `npm run schema` a partir de backend/encuestas/.
-- No editar a mano: cambiar la definición de la encuesta y volver a generar.

-- Encuesta: adultos
CREATE TABLE IF NOT EXISTS respuestas_adultos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL DEFAULT (date('now', '-3 hours')),
  edad INTEGER NOT NULL CHECK (edad BETWEEN 18 AND 99),
  carrera TEXT NOT NULL CHECK (carrera IN ('educacion_inicial', 'prof_ingles', 'prof_matematicas', 'prof_literatura', 'tec_ciencia_datos_ia', 'tec_seguridad_higiene', 'tec_adm_financiera', 'tec_acompanante_terapeutico', 'tec_trabajo_social')),
  genero TEXT NOT NULL CHECK (genero IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir')),
  situacion_laboral TEXT NOT NULL CHECK (situacion_laboral IN ('trabajo_propio', 'relacion_dependencia', 'no_trabajo')),
  depende_economicamente TEXT NOT NULL CHECK (depende_economicamente IN ('si', 'no')),
  alguien_depende TEXT NOT NULL CHECK (alguien_depende IN ('si', 'no')),
  ingresos_hogar INTEGER NOT NULL CHECK (ingresos_hogar BETWEEN 1 AND 5),
  tiene_deudas TEXT NOT NULL CHECK (tiene_deudas IN ('si', 'no')),
  deuda_relativa INTEGER CHECK (deuda_relativa BETWEEN 1 AND 5),
  aposto_12m TEXT NOT NULL CHECK (aposto_12m IN ('si', 'no')),
  frecuencia TEXT CHECK (frecuencia IN ('menos_mensual', 'algunas_mes', 'semanal', 'varias_semana', 'casi_diario')),
  motivo_diversion INTEGER CHECK (motivo_diversion IN (0, 1)),
  motivo_ganar_dinero INTEGER CHECK (motivo_ganar_dinero IN (0, 1)),
  motivo_influencia_social INTEGER CHECK (motivo_influencia_social IN (0, 1)),
  motivo_otra INTEGER CHECK (motivo_otra IN (0, 1)),
  tipo_apuesta_casino_presencial INTEGER CHECK (tipo_apuesta_casino_presencial IN (0, 1)),
  tipo_apuesta_casino_online INTEGER CHECK (tipo_apuesta_casino_online IN (0, 1)),
  tipo_apuesta_deportivas INTEGER CHECK (tipo_apuesta_deportivas IN (0, 1)),
  plataforma_legal TEXT CHECK (plataforma_legal IN ('si', 'no')),
  incluyo_a_alguien TEXT CHECK (incluyo_a_alguien IN ('si', 'no', 'no_se')),
  monto_por_vez INTEGER CHECK (monto_por_vez BETWEEN 1 AND 5),
  origen_dinero_sueldo INTEGER CHECK (origen_dinero_sueldo IN (0, 1)),
  origen_dinero_prestamo INTEGER CHECK (origen_dinero_prestamo IN (0, 1)),
  origen_dinero_planes_sociales INTEGER CHECK (origen_dinero_planes_sociales IN (0, 1)),
  origen_dinero_otro INTEGER CHECK (origen_dinero_otro IN (0, 1)),
  pgsi_1 INTEGER CHECK (pgsi_1 BETWEEN 0 AND 3),
  pgsi_2 INTEGER CHECK (pgsi_2 BETWEEN 0 AND 3),
  pgsi_3 INTEGER CHECK (pgsi_3 BETWEEN 0 AND 3),
  pgsi_4 INTEGER CHECK (pgsi_4 BETWEEN 0 AND 3),
  pgsi_5 INTEGER CHECK (pgsi_5 BETWEEN 0 AND 3),
  pgsi_6 INTEGER CHECK (pgsi_6 BETWEEN 0 AND 3),
  pgsi_7 INTEGER CHECK (pgsi_7 BETWEEN 0 AND 3),
  pgsi_8 INTEGER CHECK (pgsi_8 BETWEEN 0 AND 3),
  pgsi_9 INTEGER CHECK (pgsi_9 BETWEEN 0 AND 3),
  penso_apostar TEXT CHECK (penso_apostar IN ('si', 'no')),
  motivo_no_apuesta TEXT CHECK (motivo_no_apuesta IN ('no_me_interesa', 'miedo_perder_plata', 'miedo_adiccion', 'no_se_como', 'otro')),
  familiares_apuestan TEXT NOT NULL CHECK (familiares_apuestan IN ('si', 'no', 'no_se')),
  plata_facil TEXT NOT NULL CHECK (plata_facil IN ('si', 'no', 'a_veces')),
  canales_publicidad_redes INTEGER NOT NULL CHECK (canales_publicidad_redes IN (0, 1)),
  canales_publicidad_videojuegos INTEGER NOT NULL CHECK (canales_publicidad_videojuegos IN (0, 1)),
  canales_publicidad_streamers INTEGER NOT NULL CHECK (canales_publicidad_streamers IN (0, 1)),
  canales_publicidad_tv INTEGER NOT NULL CHECK (canales_publicidad_tv IN (0, 1)),
  canales_publicidad_calle INTEGER NOT NULL CHECK (canales_publicidad_calle IN (0, 1)),
  canales_publicidad_ninguno INTEGER NOT NULL CHECK (canales_publicidad_ninguno IN (0, 1)),
  sabe_que_es_ef TEXT NOT NULL CHECK (sabe_que_es_ef IN ('si', 'no')),
  recibio_ef TEXT NOT NULL CHECK (recibio_ef IN ('si', 'no', 'no_se')),
  donde_recibio_ef_casa INTEGER CHECK (donde_recibio_ef_casa IN (0, 1)),
  donde_recibio_ef_escuela INTEGER CHECK (donde_recibio_ef_escuela IN (0, 1)),
  donde_recibio_ef_internet INTEGER CHECK (donde_recibio_ef_internet IN (0, 1)),
  quiere_recibir_ef TEXT NOT NULL CHECK (quiere_recibir_ef IN ('si', 'no')),
  pgsi_total INTEGER CHECK (pgsi_total BETWEEN 0 AND 27),
  pgsi_categoria TEXT CHECK (pgsi_categoria IN ('sin_riesgo', 'riesgo_bajo', 'riesgo_moderado', 'juego_problematico'))
);

CREATE TRIGGER IF NOT EXISTS respuestas_adultos_sin_modificar BEFORE UPDATE ON respuestas_adultos
BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden modificar'); END;

CREATE TRIGGER IF NOT EXISTS respuestas_adultos_sin_borrar BEFORE DELETE ON respuestas_adultos
BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden borrar'); END;

-- Encuesta: adolescentes
CREATE TABLE IF NOT EXISTS respuestas_adolescentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL DEFAULT (date('now', '-3 hours')),
  edad INTEGER NOT NULL CHECK (edad BETWEEN 12 AND 17),
  genero TEXT CHECK (genero IN ('varon', 'mujer', 'otro', 'prefiero_no_decir')),
  aposto_alguna_vez TEXT CHECK (aposto_alguna_vez IN ('si_no_ultimo_anio', 'si_ultimo_anio', 'nunca', 'prefiero_no_responder')),
  en_que_aposto_deportivas_online INTEGER CHECK (en_que_aposto_deportivas_online IN (0, 1)),
  en_que_aposto_casino_online INTEGER CHECK (en_que_aposto_casino_online IN (0, 1)),
  en_que_aposto_cartas INTEGER CHECK (en_que_aposto_cartas IN (0, 1)),
  en_que_aposto_quiniela_loteria INTEGER CHECK (en_que_aposto_quiniela_loteria IN (0, 1)),
  en_que_aposto_skins INTEGER CHECK (en_que_aposto_skins IN (0, 1)),
  en_que_aposto_otro INTEGER CHECK (en_que_aposto_otro IN (0, 1)),
  en_que_aposto_prefiero_no_responder INTEGER CHECK (en_que_aposto_prefiero_no_responder IN (0, 1)),
  frecuencia_ultimo_anio TEXT CHECK (frecuencia_ultimo_anio IN ('ninguna', 'menos_mensual', 'algunas_mes', 'semanal', 'varias_semana', 'casi_diario', 'prefiero_no_responder')),
  motivo_diversion INTEGER CHECK (motivo_diversion IN (0, 1)),
  motivo_publicidad_influencers INTEGER CHECK (motivo_publicidad_influencers IN (0, 1)),
  motivo_curiosidad INTEGER CHECK (motivo_curiosidad IN (0, 1)),
  motivo_ganar_plata INTEGER CHECK (motivo_ganar_plata IN (0, 1)),
  motivo_aburrimiento INTEGER CHECK (motivo_aburrimiento IN (0, 1)),
  motivo_amigos_familia INTEGER CHECK (motivo_amigos_familia IN (0, 1)),
  motivo_otro INTEGER CHECK (motivo_otro IN (0, 1)),
  motivo_prefiero_no_responder INTEGER CHECK (motivo_prefiero_no_responder IN (0, 1)),
  como_accedio TEXT CHECK (como_accedio IN ('cuenta_propia', 'cuenta_ajena', 'en_persona', 'prefiero_no_responder')),
  conoce_alguien TEXT CHECK (conoce_alguien IN ('no', 'si_una', 'si_varias', 'prefiero_no_responder')),
  frecuencia_publicidad TEXT CHECK (frecuencia_publicidad IN ('nunca_casi_nunca', 'algunas_mes', 'algunas_semana', 'todos_los_dias', 'no_se')),
  donde_publicidad_redes INTEGER CHECK (donde_publicidad_redes IN (0, 1)),
  donde_publicidad_streamers INTEGER CHECK (donde_publicidad_streamers IN (0, 1)),
  donde_publicidad_tv INTEGER CHECK (donde_publicidad_tv IN (0, 1)),
  donde_publicidad_videojuegos INTEGER CHECK (donde_publicidad_videojuegos IN (0, 1)),
  donde_publicidad_calle INTEGER CHECK (donde_publicidad_calle IN (0, 1)),
  donde_publicidad_no_veo INTEGER CHECK (donde_publicidad_no_veo IN (0, 1)),
  escala_perder_control INTEGER CHECK (escala_perder_control BETWEEN 1 AND 5),
  escala_pasatiempo_inofensivo INTEGER CHECK (escala_pasatiempo_inofensivo BETWEEN 1 AND 5),
  percepcion_por_que_diversion INTEGER CHECK (percepcion_por_que_diversion IN (0, 1)),
  percepcion_por_que_publicidad_influencers INTEGER CHECK (percepcion_por_que_publicidad_influencers IN (0, 1)),
  percepcion_por_que_curiosidad INTEGER CHECK (percepcion_por_que_curiosidad IN (0, 1)),
  percepcion_por_que_ganar_plata INTEGER CHECK (percepcion_por_que_ganar_plata IN (0, 1)),
  percepcion_por_que_aburrimiento INTEGER CHECK (percepcion_por_que_aburrimiento IN (0, 1)),
  percepcion_por_que_amigos_familia INTEGER CHECK (percepcion_por_que_amigos_familia IN (0, 1)),
  percepcion_por_que_otro INTEGER CHECK (percepcion_por_que_otro IN (0, 1)),
  percepcion_por_que_no_se INTEGER CHECK (percepcion_por_que_no_se IN (0, 1)),
  escala_ganar_plata INTEGER CHECK (escala_ganar_plata BETWEEN 1 AND 5),
  comentario TEXT CHECK (length(comentario) <= 1000)
);

CREATE TRIGGER IF NOT EXISTS respuestas_adolescentes_sin_modificar BEFORE UPDATE ON respuestas_adolescentes
BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden modificar'); END;

CREATE TRIGGER IF NOT EXISTS respuestas_adolescentes_sin_borrar BEFORE DELETE ON respuestas_adolescentes
BEGIN SELECT RAISE(ABORT, 'Las respuestas no se pueden borrar'); END;
