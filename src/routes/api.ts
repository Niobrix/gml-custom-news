import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { NewsMessage } from '../interfaces';
import { AppServices } from './index';
import { logger } from '../config/logger';
import { getTelegramMessages, getCachedTelegramMessages } from '../services/telegram';
import { getLastTelegramCacheTime } from '../config/cache';

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
    const [Title, Description] = splitFirstLine(message.content);
    return {
      Title,
      Description,
      CreatedAt: message.createdAt,
    };
  });
};

const transformTelegramToNewsMessages = (
  telegramMessages: Array<{ message_text: string; datetime: Date }>
): NewsMessage[] => {
  return telegramMessages.map((message) => {
    const text = message.message_text.trim();
    const words = text.split(/\s+/);
    
    let title: string;
    let description: string = text;
    
    if (words.length <= 3) {
      title = text;
    } else {
      title = words.slice(0, 3).join(' ') + '...';
    }
    
    return {
      Title: title,
      Description: description,
      CreatedAt: message.datetime,
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

  fastify.get('/telegram/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const channelUsername = process.env.TELEGRAM_CHANNEL;
      
      if (!channelUsername) {
        logger.warn('TELEGRAM_CHANNEL environment variable is not set or empty');
        return [];
      }

      const saveTime = 5 * 60 * 1000;
      const lastCacheTime = getLastTelegramCacheTime();
      const cacheAge = Date.now() - lastCacheTime;
      
      if (lastCacheTime > 0 && cacheAge < saveTime) {
        logger.info(`Using cached Telegram messages (cached ${Math.round(cacheAge / 1000)} seconds ago)`);
        const cachedMessages = await getCachedTelegramMessages();
        return transformTelegramToNewsMessages(cachedMessages);
      }
      
      let telegramMessages = await getTelegramMessages(channelUsername);

      if (telegramMessages.length === 0) {
        logger.info('No messages from Telegram, using cached messages');
        telegramMessages = await getCachedTelegramMessages();
      }

      return transformTelegramToNewsMessages(telegramMessages);
    } catch (error) {
      logger.error('Error fetching Telegram messages:', error);
      request.log.error(error);

      try {
        const cachedMessages = await getCachedTelegramMessages();
        if (cachedMessages.length > 0) {
          logger.info('Using cached Telegram messages as fallback due to error');
          return transformTelegramToNewsMessages(cachedMessages);
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch Telegram messages';
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
        });
      } catch (cacheError) {
        logger.error('Error retrieving cached Telegram messages:', cacheError);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch messages from Telegram and cache',
        });
      }
    }
  });
}
