// Arma la aplicación Express. No abre ningún puerto: eso lo hace server.js.
// Separarlo permite que los tests usen la app con una base en memoria.

import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { validarRespuesta } from './validacion.js';
import { guardarRespuesta } from './db/conexion.js';
import { definicionPublica } from './encuestas/publica.js';
import { estadoDeApertura } from './ventanas.js';

const CARPETA_FRONTEND = fileURLToPath(new URL('../frontend/', import.meta.url));

// Encuestas que ya tienen frontend. Las demás solo existen como API.
const CON_FRONTEND = ['adolescentes'];

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

  const apertura = (id) => estadoDeApertura(ventanas[id] ?? null, reloj());

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

  // Páginas de las encuestas (HTML, CSS, JS y tipografías), servidas por nuestro servidor.
  app.use('/motor', express.static(`${CARPETA_FRONTEND}motor`));
  for (const id of CON_FRONTEND) {
    app.use(`/${id}`, express.static(`${CARPETA_FRONTEND}${id}`));
  }

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
