import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const loggerConfig = {
  level: LOG_LEVEL,
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined // In production, use default JSON logging for better performance
      : {
          // In development, use pretty-printing for better readability
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            colorizeObjects: true,
            ignore: 'pid,hostname',
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            hideObject: false,
          },
        },
  base: {
    service: 'gml-custom-news',
    env: process.env.NODE_ENV || 'development',
  },
};

export const logger = pino(loggerConfig);

export const logError = (message: string, error: Error | unknown): void => {
  if (error instanceof Error) {
    logger.error({ err: error }, message);
  } else {
    logger.error({ err: error }, message);
  }
};
