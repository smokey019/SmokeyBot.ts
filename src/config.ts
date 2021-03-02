import dotenv from 'dotenv';

interface IConfig {
	BOT_DB_HOST?: string;
	BOT_DB_USER?: string;
	BOT_DB_PASS?: string;
	BOT_DB_PORT?: string;
	WEB_DB_HOST?: string;
	WEB_DB_USER?: string;
	WEB_DB_PASS?: string;
	DEVELOPER_MODE?: string;
	TMI_USER?: string;
	TMI_PASSWORD?: string;
	LOG_LEVEL?: string;
	TWITTER_CONSUMER_KEY?: string;
	TWITTER_CONSUMER_SECRET?: string;
	TWITTER_ACCESS_TOKEN_KEY?: string;
	TWITTER_ACCESS_TOKEN_SECRET?: string;
	JWT_SECRET?: string;
}

const config = dotenv.config({
	debug: process.env.NODE_ENV !== 'production',
});

/**
 * Returns the Config value for the specified key.
 *
 * @param key Config key to receive the value for.
 */
export function getConfigValue<K extends keyof IConfig>(key: K): IConfig[K] {
	return config.parsed?.[key];
}
