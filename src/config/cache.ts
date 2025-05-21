import { createCache } from 'cache-manager';
import { createKeyv, Keyv } from 'cacheable';
import { KeyvFile } from 'keyv-file';
import { DiscordMessage } from '../interfaces';
import { logger } from './logger';

const CACHE_FILE = 'cache.json';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const memoryStore = createKeyv();

const fileStore = new Keyv({
  store: new KeyvFile({
    filename: CACHE_FILE,
    expiredCheckDelay: CACHE_TTL,
  }),
});

export const cache = createCache({
  stores: [memoryStore, fileStore],
  ttl: CACHE_TTL,
});

export const setMessagesCached = async (messages: DiscordMessage[]): Promise<void> => {
  try {
    await cache.set('messages', messages);
    logger.debug(`Cached ${messages.length} messages`);
  } catch (error) {
    logger.error('Error caching messages:', error);
    // We don't throw the error to avoid disrupting the main application flow
  }
};

export const getMessagesCached = async (): Promise<DiscordMessage[]> => {
  try {
    const messages = await cache.get<DiscordMessage[]>('messages');
    return messages || [];
  } catch (error) {
    logger.error('Error retrieving cached messages:', error);
    return [];
  }
};
