import { FastifyInstance } from 'fastify';
import apiRoutes from './api';
import { DiscordService } from '../services/discord';

export interface AppServices {
  discordService: DiscordService;
}

export const setupRoutes = (app: FastifyInstance, services: AppServices) => {
  app.register(apiRoutes, { services });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });
};
