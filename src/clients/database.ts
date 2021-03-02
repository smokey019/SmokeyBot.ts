import knex from 'knex';
import { getConfigValue } from '../config';
import { BlacklistedWords } from '../models/BlacklistedWords';
import { ChannelSettings } from '../models/ChannelSettings';
import { Commands } from '../models/Commands';
import { CustomCommands } from '../models/CustomCommands';
import { Keywords } from '../models/Keywords';
import { Timers } from '../models/Timers';
import { TwitchAds } from '../models/TwitchAds';
import { getLogger } from './logger';

const webLogger = getLogger('Web-Database');
const botLogger = getLogger('Bot-Database');

export const botDB = knex({
	client: 'mysql2',
	connection: {
		database: 'smokeybot',
		host: getConfigValue('BOT_DB_HOST'),
		password: getConfigValue('BOT_DB_PASS'),
		port: parseInt(getConfigValue('BOT_DB_PORT')),
		user: getConfigValue('BOT_DB_USER'),
		charset: 'utf8mb4',
	},
	pool: { min: 0, max: 50 },
	log: {
		warn(message) {
			botLogger.warn(message);
		},
		error(message) {
			botLogger.error(message);
		},
		deprecate(message) {
			botLogger.error(message);
		},
		debug(message) {
			botLogger.debug(message);
		},
	},
});

export const webDB = knex({
	client: 'mysql2',
	connection: {
		database: 'smokeybot_web',
		host: getConfigValue('WEB_DB_HOST'),
		password: getConfigValue('WEB_DB_PASS'),
		user: getConfigValue('WEB_DB_USER'),
		charset: 'utf8mb4',
	},
	pool: { min: 0, max: 50 },
	log: {
		warn(message) {
			webLogger.warn(message);
		},
		error(message) {
			webLogger.error(message);
		},
		deprecate(message) {
			webLogger.error(message);
		},
		debug(message) {
			webLogger.debug(message);
		},
	},
});

export async function getChannels(
	auto_join: number,
): Promise<Array<ChannelSettings>> {
	if (auto_join == 1) {
		const channels = await botDB<ChannelSettings>('user_settings')
			.select()
			.where('auto_join', 1);

		return channels;
	} else {
		const channels = await botDB<ChannelSettings>('user_settings').select();

		return channels;
	}
}

export async function getChannelSettings(
	channel_id: number | string,
): Promise<ChannelSettings> {
	const channelSettings = await botDB<ChannelSettings>('user_settings')
		.select()
		.where('channel_id', channel_id);

	return channelSettings[0];
}

export async function getCommands(
	channel_id: number | string,
): Promise<Array<Commands>> {
	const commands = await botDB<Commands>('commands')
		.select()
		.where('channel_id', channel_id);

	return commands;
}

export async function getCustomCommands(
	channel_id: number | string,
): Promise<CustomCommands> {
	const custom_commands = await botDB
		.from('custom_commands')
		.select()
		.where('channel_id', channel_id);

	return custom_commands[0];
}

export async function getKeywords(
	channel_id: number | string,
): Promise<Array<Keywords>> {
	const keywords = await botDB
		.from('keywords')
		.select()
		.where('channel_id', channel_id);

	return keywords;
}

export async function getTimers(
	channel_id: number | string,
): Promise<Array<Timers>> {
	const timers = await botDB
		.from('timers')
		.select()
		.where('twitch_id', channel_id);

	return timers;
}

export async function getBlacklistedWords(
	channel_id: number | string,
): Promise<Array<BlacklistedWords>> {
	const blacklist = await botDB
		.from('blacklisted_words')
		.select()
		.where('channel_id', channel_id);

	return blacklist;
}

export async function getTwitchAdvertisements(
	channel_id: number | string,
): Promise<Array<TwitchAds>> {
	const twitch_advertisements = await webDB
		.from('twitch_advertisements')
		.select()
		.where('channel_id', channel_id);

	return twitch_advertisements;
}
