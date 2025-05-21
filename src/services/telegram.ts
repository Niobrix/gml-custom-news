import { telegram_scraper } from 'telegram-scraper'
import { TelegramMessage } from '../interfaces';
import { logger } from '../config/logger';
import { setTelegramMessagesCached, getTelegramMessagesCached } from '../config/cache';

export const getTelegramMessages = async (channelUsername: string): Promise<TelegramMessage[]> => {
    try {
        const messages = JSON.parse(await telegram_scraper(channelUsername));
        const telegramMessages: TelegramMessage[] = messages
            .filter((message: any) => message.datetime)
            .map((message: any) => ({
                message_text: message.message_text,
                datetime: new Date(message.datetime)
            }));
        
        const reversedMessages = [...telegramMessages].reverse();
        
        await setTelegramMessagesCached(reversedMessages);
        
        return reversedMessages;
    } catch (error) {
        logger.error('Error fetching Telegram messages:', error);
        throw error;
    }
}

export const getCachedTelegramMessages = async (): Promise<TelegramMessage[]> => {
    return await getTelegramMessagesCached();
}