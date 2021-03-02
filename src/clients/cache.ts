import Keyv from 'keyv';
import { BlacklistedWords } from '../models/BlacklistedWords';
import { ChannelSettings } from '../models/ChannelSettings';
import { Commands } from '../models/Commands';
import { CustomCommands } from '../models/CustomCommands';
import { Keywords } from '../models/Keywords';
import { Timers } from '../models/Timers';
import { TwitchAds } from '../models/TwitchAds';
import { getCurrentTime } from '../utils';
import {
	botDB,
	getBlacklistedWords,
	getChannelSettings,
	getCommands,
	getCustomCommands,
	getKeywords,
	getTimers,
	getTwitchAdvertisements,
} from './database';
import { getLogger } from './logger';
import { tmiClient } from './tmi';

const logger = getLogger('Cache');

export interface ICache {
	channel: string;
	chat_lines: number;
	flood: { count: number; protected: boolean; time: number };
	cache_timer: number;
	live: string;
	game: string;
	uptime: any;
	started_at: string;
	stream_id: number;
	title: string;
	viewers: number;
	last_db_update: number;
	timering: boolean;
	last_command: number;
	last_gamble: number;
	active_users: Array<any>;
	active_user_list: Array<string>;
	gainer_time: number;
}

export interface IDBCache {
	channelSettings: ChannelSettings;
	commands: Array<Commands>;
	blacklist: Array<BlacklistedWords>;
	custom_commands: CustomCommands;
	keywords: Array<Keywords>;
	timers: Array<Timers>;
	twitch_advertisements: Array<TwitchAds>;
	updated_at?: number;
}

export const cacheClient = new Keyv({ namespace: 'channel_cache' });

export const dbCache = new Keyv({ namespace: 'db_cache' });

export const GLOBAL_COOLDOWN = new Keyv({ namespace: 'GLOBAL_COOLDOWN' });
export const PERSONAL_COOLDOWN = new Keyv({ namespace: 'PERSONAL_COOLDOWN' });
export const ACTIVE_USER_CACHE = new Keyv({ namespace: 'ACTIVE_USER_CACHE' });
export const GAINER_TIMER = new Keyv({ namespace: 'GAINER_TIMER' });
export const PERMIT_LIST = new Keyv({ namespace: 'PERMIT_LIST' });

cacheClient.on('error', (error) => logger.error(error));

dbCache.on('error', (error) => logger.error(error));
GLOBAL_COOLDOWN.on('error', (error) => logger.error(error));
PERSONAL_COOLDOWN.on('error', (error) => logger.error(error));
ACTIVE_USER_CACHE.on('error', (error) => logger.error(error));
GAINER_TIMER.on('error', (error) => logger.error(error));

export async function getGCD(channel: string): Promise<number> {
	const GCD = await GLOBAL_COOLDOWN.get(channel);

	if (GCD == undefined) {
		const timestamp = getCurrentTime();
		await GLOBAL_COOLDOWN.set(channel, timestamp - 300);
		return timestamp - 300;
	} else {
		return GCD;
	}
}

export async function getPCD(channel: string): Promise<number> {
	const PCD = await PERSONAL_COOLDOWN.get(channel);

	if (PCD == undefined) {
		const timestamp = getCurrentTime();
		await PERSONAL_COOLDOWN.set(channel, timestamp - 300);
		return timestamp - 300;
	} else {
		return PCD;
	}
}

export async function getDB(
	channel: string,
	channel_id: string | number,
): Promise<any> {
	const cache = await dbCache.get(channel);

	if (cache == undefined) {
		await dbCache.set(channel, 'temp');

		const database = {
			channelSettings: await getChannelSettings(channel_id),
			commands: await getCommands(channel_id),
			blacklist: await getBlacklistedWords(channel_id),
			custom_commands: await getCustomCommands(channel_id),
			keywords: await getKeywords(channel_id),
			timers: await getTimers(channel_id),
			twitch_advertisements: await getTwitchAdvertisements(channel_id),
			updated_at: getCurrentTime(),
		};

		if (await dbCache.set(channel, database)) {
			//updateMods(channel);
			logger.info(`Successfully initiated DB Cache for ${channel}.`);
		}

		return database;
	} else {
		if (getCurrentTime() - cache.updated_at >= 30) {
			cache.updated_at = getCurrentTime();
			await dbCache.set(channel, cache);

			const database = {
				channelSettings: await getChannelSettings(channel_id),
				commands: await getCommands(channel_id),
				blacklist: await getBlacklistedWords(channel_id),
				custom_commands: await getCustomCommands(channel_id),
				keywords: await getKeywords(channel_id),
				timers: await getTimers(channel_id),
				twitch_advertisements: await getTwitchAdvertisements(channel_id),
				updated_at: getCurrentTime(),
			};

			if (await dbCache.set(channel, database)) {
				//updateMods(channel);
				logger.trace(`DB Cache expired.. updated cache for ${channel}.`);
				return cache;
			}
		} else {
			return cache;
		}
	}
}

/**
 * Update moderator list
 * @param channel
 * @param cache
 */
export async function updateMods(channel: string): Promise<any> {
	tmiClient
		.mods(channel)
		.then((moderators) => {
			parseMods(channel, moderators);
		})
		.catch((err) => {
			logger.error(err);
		});
}

async function parseMods(channel: string, mods: string | string[]) {
	channel = channel.replace('#', '');

	const db = await dbCache.get(channel);

	logger.debug(
		`Updating moderators for ${channel} - ${mods.length} total mods.`,
	);

	if (!mods.includes('smokeybot') && db.channelSettings.modded) {
		const update_settings = await botDB('user_settings')
			.where({
				channel_name: channel,
			})
			.update({ moderators: JSON.stringify(mods), modded: 0 });

		if (update_settings) {
			logger.debug(
				`We're not a mod in ${channel} anymore.. let's update that.`,
			);
		} else {
			logger.error(
				`There was an error updating the user_settings table for ${channel}.`,
			);
		}
	} else if (mods.includes('smokeybot') && !db.channelSettings.modded) {
		const update_settings = await botDB('user_settings')
			.where({
				channel_name: channel,
			})
			.update({ moderators: JSON.stringify(mods), modded: 1 });

		if (update_settings) {
			logger.debug(`We're a mod in ${channel}, that's pretty neat!`);
		} else {
			logger.error(
				`There was an error updating the user_settings table for ${channel}.`,
			);
		}
	}
}
