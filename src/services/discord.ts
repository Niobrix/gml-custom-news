import { Message, TextChannel, NewsChannel } from 'discord.js';
import removeMd from 'remove-markdown';
import { client } from '../bot/bot';
import { logger } from '../config/logger';
import type { DiscordMessage } from '../interfaces';
import { setMessagesCached, getMessagesCached } from '../config/cache';

/**
 * Cleans Discord user mentions (<@12341234>) from message content
 */
const cleanUserMentions = (content: string): string => {
  return content.replace(/<@\d+>/g, '');
};

export interface DiscordService {
  getChannelMessages(): Promise<DiscordMessage[]>;
  getCachedMessages(): Promise<DiscordMessage[]>;
}

export const createDiscordService = (): DiscordService => {
  return {
    getChannelMessages: async (): Promise<DiscordMessage[]> => {
      try {
        const channelId = process.env.CHANNEL_ID;

        if (!channelId) {
          logger.error('CHANNEL_ID is not set in environment variables');
          throw new Error('CHANNEL_ID is not set in environment variables');
        }

        if (!client.isReady()) {
          logger.warn('Discord bot is not ready yet, cannot fetch messages');
          return [];
        }

        const channel = await client.channels.fetch(channelId);

        if (!channel || !(channel instanceof TextChannel || channel instanceof NewsChannel)) {
          const error = new Error(
            `Channel with ID ${channelId} not found or is not a text/news channel`
          );
          logger.error(error.message);
          throw error;
        }

        const messages: DiscordMessage[] = [];
        let lastId: string | undefined;

        while (true) {
          const options: { limit: number; before?: string } = { limit: 100 };
          if (lastId) {
            options.before = lastId;
          }

          const fetchedMessages = await channel.messages.fetch(options);

          if (fetchedMessages.size === 0) {
            break;
          }

          fetchedMessages.forEach((message: Message) => {
            const attachments = Array.from(message.attachments.values()).map((attachment) => ({
              id: attachment.id,
              url: attachment.url,
              name: attachment.name || 'attachment',
            }));

            messages.push({
              id: message.id,
              content: removeMd(cleanUserMentions(message.content)),
              author: message.author.username,
              createdAt: message.createdAt,
              attachments,
            });
          });

          lastId = fetchedMessages.last()?.id;
        }

        await setMessagesCached(messages);
        return messages;
      } catch (error) {
        logger.error('Error fetching Discord messages:', error);
        throw error;
      }
    },

    getCachedMessages: async (): Promise<DiscordMessage[]> => {
      return getMessagesCached();
    },
  };
};
