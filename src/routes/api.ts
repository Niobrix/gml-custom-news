import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { NewsMessage } from '../interfaces';
import { AppServices } from './index';
import { logger } from '../config/logger';

const splitFirstLine = (text: string): [string, string] => {
  const cleaned = text.replace(/^(?:\s*\r?\n)+/, '');
  const [firstLine, ...rest] = cleaned.split('\n');
  while (rest.length > 0 && rest[0].trim() === '') {
    rest.shift();
  }

  return [firstLine, rest.join('\n')];
};

const transformToNewsMessages = (
  messages: Array<{ id: string; content: string; createdAt: Date }>
): NewsMessage[] => {
  return messages.map((message) => {
    const [title, description] = splitFirstLine(message.content);
    return {
      id: Number(message.id),
      title,
      description,
      createdAt: message.createdAt,
    };
  });
};

export default async function (
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  const { services } = options as { services: AppServices };

  fastify.get('/discord/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let messages = await services.discordService.getChannelMessages();

      if (messages.length === 0) {
        logger.info('No messages from Discord, using cached messages');
        messages = await services.discordService.getCachedMessages();
      }

      return transformToNewsMessages(messages);
    } catch (error) {
      logger.error('Error fetching Discord messages:', error);
      request.log.error(error);

      try {
        const cachedMessages = await services.discordService.getCachedMessages();
        if (cachedMessages.length > 0) {
          logger.info('Using cached messages as fallback due to error');
          return transformToNewsMessages(cachedMessages);
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch Discord messages';
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
        });
      } catch (cacheError) {
        logger.error('Error retrieving cached messages:', cacheError);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch messages from Discord and cache',
        });
      }
    }
  });
}
