// src/middleware/requestLogger.ts

import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger.js';

export const requestLogger = pinoHttp({
  logger,

  genReqId: () => randomUUID(),

  // Return the request ID to the caller for troubleshooting.
  customProps: (req) => ({
    requestId: req.id,
  }),

  // Avoid logging request headers or query parameters,
  // which may contain sensitive information.
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url?.split('?')[0],
    }),

    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },

  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  autoLogging: true,
});