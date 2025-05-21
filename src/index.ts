import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initBot } from './bot/bot';
import { setupRoutes } from './routes';
import { logger, loggerConfig } from './config/logger';
import { createDiscordService } from './services/discord';

dotenv.config();

async function bootstrap() {
  try {
    const app = Fastify({ logger: loggerConfig });

    await app.register(cors, {
      origin: true,
    });

    const discordService = createDiscordService();

    setupRoutes(app, { discordService });

    const PORT = process.env.PORT || 3000;
    await app.listen({ port: Number(PORT), host: '0.0.0.0' });
    logger.info(`Server is running on port ${PORT}`);

    await initBot().catch((error: Error) => {
      logger.error('Failed to initialize Discord bot:', error);
    });

    return app;
  } catch (error) {
    logger.error('Application failed to start:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  logger.error('Unhandled error during bootstrap:', error);
  process.exit(1);
});
