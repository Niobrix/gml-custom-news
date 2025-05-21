import { createCache } from 'cache-manager';
import { createKeyv, Keyv } from 'cacheable';
import { KeyvFile } from 'keyv-file';
import { DiscordMessage, TelegramMessage } from '../interfaces';
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

let lastTelegramCacheTime: number = 0;

export const setMessagesCached = async (messages: DiscordMessage[]): Promise<void> => {
  try {
    await cache.set('discord_messages', messages);
    logger.debug(`Cached ${messages.length} Discord messages`);
  } catch (error) {
    logger.error('Error caching Discord messages:', error);
  }
};

export const getMessagesCached = async (): Promise<DiscordMessage[]> => {
  try {
    const messages = await cache.get<DiscordMessage[]>('discord_messages');
    return messages || [];
  } catch (error) {
    logger.error('Error retrieving cached Discord messages:', error);
    return [];
  }
};

export const setTelegramMessagesCached = async (messages: TelegramMessage[]): Promise<void> => {
  try {
    await cache.set('telegram_messages', messages);
    lastTelegramCacheTime = Date.now();
    logger.debug(`Cached ${messages.length} Telegram messages at ${new Date(lastTelegramCacheTime).toISOString()}`);
  } catch (error) {
    logger.error('Error caching Telegram messages:', error);
  }
};

export const getTelegramMessagesCached = async (): Promise<TelegramMessage[]> => {
  try {
    const messages = await cache.get<TelegramMessage[]>('telegram_messages');
    return messages || [];
  } catch (error) {
    logger.error('Error retrieving cached Telegram messages:', error);
    return [];
  }
};

export const getLastTelegramCacheTime = (): number => {
  return lastTelegramCacheTime;
};
