import pino from 'pino';

// Determine log level from environment or use default
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Configure logger based on environment
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
  // Add service name for better identification in logs
  base: {
    service: 'gml-discord-news',
    env: process.env.NODE_ENV || 'development',
  },
};

// Create logger instance
export const logger = pino(loggerConfig);

// Export convenience methods for use throughout the application
export const logError = (message: string, error: Error | unknown): void => {
  if (error instanceof Error) {
    logger.error({ err: error }, message);
  } else {
    logger.error({ err: error }, message);
  }
};
