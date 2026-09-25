// Arma la aplicación Express. No abre ningún puerto: eso lo hace server.js.
// Separarlo permite que los tests usen la app con una base en memoria.

import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { validarRespuesta } from './validacion.js';
import { guardarRespuesta } from './db/conexion.js';

/**
 * @param {object} opciones
 * @param {import('@libsql/client').Client} opciones.db
 * @param {Record<string, object>} opciones.encuestas
 * @param {boolean|number} [opciones.trustProxy] - true/1 si hay un proxy delante (Render, ngrok).
 * @param {number} [opciones.limiteEnviosPorMinuto]
 */
export function crearApp({ db, encuestas, trustProxy = false, limiteEnviosPorMinuto = 30 }) {
  const app = express();

  // Detrás de un proxy, la IP real de quien responde viene en un encabezado.
  // Sin esto, todas las personas "tendrían" la IP del proxy y compartirían el límite.
  app.set('trust proxy', trustProxy);

  // Encabezados de seguridad estándar (evita que la página se incruste en otros sitios, etc.).
  app.use(helmet());

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

  app.post('/api/respuestas/:encuesta', limitador, async (req, res, next) => {
    const encuesta = encuestas[req.params.encuesta];
    if (!encuesta) return res.status(404).json({ ok: false, errores: ['Encuesta inexistente'] });

    const resultado = validarRespuesta(encuesta, req.body);
    if (!resultado.ok) return res.status(400).json(resultado);

    try {
      await guardarRespuesta(db, encuesta, resultado.fila);
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

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
