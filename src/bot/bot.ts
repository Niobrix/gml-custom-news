import { Client, Events, GatewayIntentBits } from 'discord.js';
import { logger } from '../config/logger';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

export const initBot = async (): Promise<void> => {
  try {
    registerEvents();

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      throw new Error('DISCORD_BOT_TOKEN is not set in environment variables');
    }

    await client.login(token);
    logger.info(`Logged in as ${client.user?.tag}`);
  } catch (error) {
    logger.error('Failed to initialize Discord bot:', error);
    throw error;
  }
};

const registerEvents = (): void => {
  client.once(Events.ClientReady, () => {
    logger.info('Discord bot is ready');
  });

  client.on(Events.Error, (error) => {
    logger.error('Discord client error:', error);
  });

  client.on(Events.Debug, (info) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Discord client debug:', info);
    }
  });

  client.on(Events.Warn, (warning) => {
    logger.warn('Discord client warning:', warning);
  });

  client.on(Events.ShardReconnecting, (id) => {
    logger.warn(`Discord client is reconnecting (Shard ID: ${id})`);
  });

  client.on(Events.ShardResume, (id, replayedEvents) => {
    logger.info(
      `Discord client connection resumed (Shard ID: ${id}, Replayed events: ${replayedEvents})`
    );
  });
};
