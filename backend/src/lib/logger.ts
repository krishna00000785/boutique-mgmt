// src/lib/logger.ts

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.passwordHash',
      'req.body.token',
    ],
    censor: '[REDACTED]',
  },

  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});