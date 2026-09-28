// Arma la aplicación Express. No abre ningún puerto: eso lo hace server.js.
// Separarlo permite que los tests usen la app con una base en memoria.

import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { validarEvento, validarRespuesta } from './validacion.js';
import { guardarEvento, guardarRespuesta } from './db/conexion.js';
import { definicionPublica } from './encuestas/publica.js';
import { estadoDeApertura } from './ventanas.js';
import { crearAcceso, leerCookie } from './acceso.js';
import { resultados } from './resultados/index.js';
import { exportarExcel } from './resultados/excel.js';

const CARPETA_FRONTEND = fileURLToPath(new URL('../frontend/', import.meta.url));

// Encuestas que ya tienen frontend. Las demás solo existen como API.
const CON_FRONTEND = ['adolescentes', 'adultos'];

/**
 * @param {object} opciones
 * @param {import('@libsql/client').Client} opciones.db
 * @param {Record<string, object>} opciones.encuestas
 * @param {Record<string, {inicio: Date, fin: Date}[] | null>} [opciones.ventanas]
 *   Ventanas de apertura por encuesta. Si una encuesta no tiene, está siempre abierta.
 * @param {() => Date} [opciones.reloj] - Hora actual (se reemplaza en los tests).
 * @param {boolean|number} [opciones.trustProxy] - true/1 si hay un proxy delante (Render, ngrok).
 * @param {number} [opciones.limiteEnviosPorMinuto]
 */
export function crearApp({
  db,
  encuestas,
  ventanas = {},
  reloj = () => new Date(),
  trustProxy = false,
  limiteEnviosPorMinuto = 30,
  limiteEventosPorMinuto = 1500,
  acceso = crearAcceso({ claves: {} }),
}) {
  const app = express();

  // Detrás de un proxy, la IP real de quien responde viene en un encabezado.
  // Sin esto, todas las personas "tendrían" la IP del proxy y compartirían el límite.
  app.set('trust proxy', trustProxy);

  // Encabezados de seguridad. La política de contenido (CSP) le dice al navegador que
  // solo cargue scripts, estilos, tipografías y datos de NUESTRO servidor: aunque alguien
  // lograra inyectar un enlace externo, el navegador no lo cargaría.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'"],
          'font-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
        },
      },
    }),
  );

  // Un envío completo pesa ~2 KB. Cualquier cosa mucho más grande no es una respuesta real.
  app.use(express.json({ limit: '16kb' }));

  // Límite de envíos por IP. Ojo: en un aula, todos comparten la IP del wifi de la
  // institución, así que el límite tiene que alcanzar para un curso entero enviando a la vez.
  const limitador = rateLimit({
    windowMs: 60_000,
    limit: limiteEnviosPorMinuto,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { ok: false, errores: ['Demasiados envíos seguidos. Esperá un minuto.'] },
  });

  // Los eventos son muchos más (unos 40 por persona) y en un aula todos comparten la IP:
  // un curso de 30 recorriendo la encuesta a la vez son ~1200 en pocos minutos.
  const limitadorEventos = rateLimit({
    windowMs: 60_000,
    limit: limiteEventosPorMinuto,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { ok: false, errores: ['Demasiados eventos seguidos.'] },
  });

  const apertura = (id) => estadoDeApertura(ventanas[id] ?? null, reloj());

  // Salud: lo consulta un monitor externo cada ~10 minutos para que el servidor gratuito no
  // se duerma durante la semana de encuesta. No toca la base (sería una consulta inútil cada
  // vez) y no devuelve nada sobre las encuestas.
  app.get('/api/salud', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ ok: true });
  });

  // Definición de la encuesta para el frontend: preguntas, opciones, ramas, textos
  // y si está abierta en este momento.
  app.get('/api/encuestas/:encuesta', (req, res) => {
    const encuesta = encuestas[req.params.encuesta];
    if (!encuesta) return res.status(404).json({ ok: false, errores: ['Encuesta inexistente'] });
    const { abierta, proximaApertura } = apertura(encuesta.id);
    res.json({ ...definicionPublica(encuesta), abierta, proximaApertura });
  });

  app.post('/api/respuestas/:encuesta', limitador, async (req, res, next) => {
    const encuesta = encuestas[req.params.encuesta];
    if (!encuesta) return res.status(404).json({ ok: false, errores: ['Encuesta inexistente'] });

    const { aceptaEnvios, proximaApertura } = apertura(encuesta.id);
    if (!aceptaEnvios) {
      return res.status(403).json({ ok: false, cerrada: true, proximaApertura, errores: ['Encuesta cerrada'] });
    }

    const resultado = validarRespuesta(encuesta, req.body);
    if (!resultado.ok) return res.status(400).json(resultado);

    try {
      await guardarRespuesta(db, encuesta, resultado.fila);
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  // Eventos del recorrido: cuántos no participaron y dónde se abandona. Son conteos
  // aproximados (cualquiera podría mandar eventos a mano), por eso nunca tocan las respuestas.
  // Fuera de horario no se registran: no son parte de la encuesta.
  app.post('/api/eventos/:encuesta', limitadorEventos, async (req, res, next) => {
    const encuesta = encuestas[req.params.encuesta];
    if (!encuesta) return res.status(404).json({ ok: false, errores: ['Encuesta inexistente'] });
    const resultado = validarEvento(encuesta, req.body);
    if (!resultado.ok) return res.status(400).json(resultado);
    if (!apertura(encuesta.id).aceptaEnvios) return res.status(204).end();
    try {
      await guardarEvento(db, encuesta, resultado.fila);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // --- Resultados (protegidos) ------------------------------------------------------
  // Ver backend/acceso.js. Nada de esto devuelve una respuesta individual, salvo el
  // Excel completo de Juli.

  const COOKIE = 'sesion';
  const limitadorAcceso = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { ok: false, errores: ['Demasiados intentos. Esperá unos minutos.'] },
  });
  // Los resultados nunca se guardan en cachés (del navegador ni intermedias).
  const sinCache = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  };
  const datosDeSesion = (s) => ({ rol: s.rol, nombre: s.nombre, encuestas: s.encuestas, control: s.control, excelCompleto: s.excelCompleto });

  // Pide sesión y, si la ruta tiene :encuesta, que el rol pueda verla.
  const conSesion = (req, res, next) => {
    const s = acceso.sesion(leerCookie(req, COOKIE));
    if (!s) return res.status(401).json({ ok: false, sesionVencida: true, errores: ['Ingresá la contraseña'] });
    const id = req.params.encuesta;
    if (id !== undefined && (!encuestas[id] || !s.encuestas.includes(id))) {
      return res.status(404).json({ ok: false, errores: ['No encontrado'] });
    }
    req.sesion = s;
    next();
  };

  app.post('/api/acceso', sinCache, limitadorAcceso, (req, res) => {
    const rol = acceso.rolDeClave(req.body?.clave);
    if (!rol) return res.status(401).json({ ok: false, errores: ['Contraseña incorrecta'] });
    const token = acceso.abrirSesion(rol);
    // HttpOnly: el JavaScript de la página no la lee. SameSite=Strict: otro sitio no la usa.
    // Secure cuando la conexión es HTTPS (en Render; en local, sin HTTPS, no se podría).
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/', maxAge: 8 * 60 * 60 * 1000 });
    res.json({ ok: true, ...datosDeSesion(acceso.sesion(token)) });
  });

  app.get('/api/sesion', sinCache, conSesion, (req, res) => res.json({ ok: true, ...datosDeSesion(req.sesion) }));

  app.post('/api/salir', sinCache, (req, res) => {
    acceso.cerrarSesion(leerCookie(req, COOKIE));
    res.clearCookie(COOKIE, { path: '/' });
    res.status(204).end();
  });

  app.get('/api/resultados/:encuesta', sinCache, conSesion, async (req, res, next) => {
    try {
      const { umbral, control } = req.sesion;
      res.json(await resultados(db, encuestas[req.params.encuesta], { umbral, control }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/exportar/:encuesta', sinCache, conSesion, async (req, res, next) => {
    try {
      const encuesta = encuestas[req.params.encuesta];
      const { umbral, control, excelCompleto } = req.sesion;
      const datos = await resultados(db, encuesta, { umbral, control });
      const completa = excelCompleto ? { encuesta, filas: (await db.execute(`SELECT * FROM ${encuesta.tabla} ORDER BY id`)).rows } : undefined;
      const archivo = await exportarExcel(datos, completa);
      const nombre = `resultados-${encuesta.id}${excelCompleto ? '-completo' : ''}.xlsx`;
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', `attachment; filename="${nombre}"`);
      res.send(archivo);
    } catch (error) {
      next(error);
    }
  });

  // Páginas de las encuestas (HTML, CSS, JS y tipografías), servidas por nuestro servidor.
  app.use('/motor', express.static(`${CARPETA_FRONTEND}motor`));
  for (const id of CON_FRONTEND) {
    app.use(`/${id}`, express.static(`${CARPETA_FRONTEND}${id}`));
  }
  // La página del dashboard es pública (no tiene datos); los datos piden sesión.
  app.use('/resultados', express.static(`${CARPETA_FRONTEND}resultados`));

  app.use((req, res) => res.status(404).json({ ok: false, errores: ['No encontrado'] }));

  // Manejo de errores. Nunca se registra el cuerpo de la respuesta: es anónima.
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ ok: false, errores: ['JSON mal formado'] });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ ok: false, errores: ['Envío demasiado grande'] });
    }
    console.error(`[${new Date().toISOString()}] Error en ${req.method} ${req.path}:`, error.message);
    res.status(500).json({ ok: false, errores: ['Error interno. Probá de nuevo en un momento.'] });
  });

  return app;
}
