import fetch from 'node-fetch';
import { ChatUserstate } from 'tmi.js';
import { cacheClient, ICache } from '../../clients/cache';
import { getChannelSettings } from '../../clients/database';
import { getLogger } from '../../clients/logger';
import { getConfigValue } from '../../config';
import { getCurrentTime } from '../../utils';

const logger = getLogger('Cache');

const do_not_cache = [];

/**
 *
 * @param {string} channel
 * @param {[]} context
 */
export async function getCache(
	channel: string,
	context: ChatUserstate,
): Promise<ICache> {
	const timestamp = getCurrentTime();

	const channel_id = context['room-id'];

	let cache: ICache = await cacheClient.get(channel);

	if (cache == undefined) {
		if (!do_not_cache.includes(channel)) {
			do_not_cache.push(channel);

			const channelSettings = await getChannelSettings(channel_id);

			fetch(
				`https://api.smokey.gg/twitch/streams/${context['room-id']}/${context['room-id']}`,
				{
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + getConfigValue('JWT_SECRET'),
					},
				},
			)
				.then((res) => res.json())
				.then(async (json) => {
					if (json._data) {
						if (json._data.game_id) {
							fetch(
								`https://api.smokey.gg/twitch/games/${context['room-id']}/${json._data.game_id}`,
								{
									method: 'GET',
									headers: {
										Authorization: 'Bearer ' + getConfigValue('JWT_SECRET'),
									},
								},
							)
								.then((res) => res.json())
								.then(async (game) => {
									cache = {
										channel: channel,
										chat_lines: 1,
										flood: {
											count: 0,
											protected: false,
											time: parseInt(context['tmi-sent-ts']),
										},
										cache_timer: timestamp,
										live: json._data.type,
										game: game._data.name,
										uptime: json._data,
										started_at: json._data.started_at,
										stream_id: json._data.id,
										title: json._data.title,
										viewers: json._data.viewer_count,
										last_db_update: timestamp,
										timering: false,
										last_command: timestamp - channelSettings.global_cooldown,
										last_gamble: timestamp - channelSettings.gambling_cooldown,
										active_users: [],
										active_user_list: [],
										gainer_time: timestamp,
									};

									if (await cacheClient.set(channel, cache)) {
										logger.info(`Initializing cache for ${channel}..`);
										return cache;
									}
								})
								.then((cache) => cache);
						} else {
							cache = {
								channel: channel,
								chat_lines: 1,
								flood: {
									count: 0,
									protected: false,
									time: parseInt(context['tmi-sent-ts']),
								},
								cache_timer: timestamp,
								live: null,
								game: null,
								uptime: null,
								title: null,
								viewers: null,
								started_at: null,
								stream_id: null,
								last_db_update: timestamp,
								timering: false,
								last_command: timestamp - channelSettings.global_cooldown,
								last_gamble: timestamp - channelSettings.gambling_cooldown,
								active_users: [],
								active_user_list: [],
								gainer_time: timestamp,
							};

							if (await cacheClient.set(channel, cache)) {
								logger.info(`Initializing cache for ${channel}..`);
								return cache;
							}
						}
					} else {
						// offline

						cache = {
							channel: channel,
							chat_lines: 1,
							flood: {
								count: 0,
								protected: false,
								time: parseInt(context['tmi-sent-ts']),
							},
							cache_timer: timestamp,
							live: null,
							game: null,
							uptime: null,
							title: null,
							viewers: null,
							started_at: null,
							stream_id: null,
							last_db_update: timestamp,
							timering: false,
							last_command: timestamp - channelSettings.global_cooldown,
							last_gamble: timestamp - channelSettings.gambling_cooldown,
							active_users: [],
							active_user_list: [],
							gainer_time: timestamp,
						};

						if (await cacheClient.set(channel, cache)) {
							logger.info(`Initializing cache for ${channel}..`);
							return cache;
						}
					}
				})
				.then((cache) => cache);
		}
	} else {
		if (timestamp - cache.cache_timer >= 60) {
			cache.cache_timer = getCurrentTime();
			await cacheClient.set(channel, cache);

			fetch(
				`https://api.smokey.gg/twitch/streams/${context['room-id']}/${context['room-id']}`,
				{
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + getConfigValue('JWT_SECRET'),
					},
				},
			)
				.then((res) => res.json())
				.then(async (json) => {
					if (json._data) {
						if (json._data.game_id) {
							fetch(
								`https://api.smokey.gg/twitch/games/${context['room-id']}/${json._data.game_id}`,
								{
									method: 'GET',
									headers: {
										Authorization: 'Bearer ' + getConfigValue('JWT_SECRET'),
									},
								},
							)
								.then((res) => res.json())
								.then(async (game) => {
									cache = {
										channel: channel,
										chat_lines: cache.chat_lines,
										flood: {
											count: cache.flood.count,
											protected: cache.flood.protected,
											time: cache.flood.time,
										},
										cache_timer: timestamp,
										live: json._data.type,
										game: game._data.name,
										uptime: json._data,
										started_at: json._data.started_at,
										stream_id: json._data.id,
										title: json._data.title,
										viewers: json._data.viewer_count,
										last_db_update: timestamp,
										timering: cache.timering,
										last_command: cache.last_command,
										last_gamble: cache.last_gamble,
										active_users: cache.active_users,
										active_user_list: cache.active_user_list,
										gainer_time: cache.gainer_time,
									};

									if (await cacheClient.set(channel, cache)) {
										logger.debug(`Updating cache for ${channel}..`);
										return cache;
									}
								})
								.then((cache) => cache);
						} else {
							cache = {
								channel: channel,
								chat_lines: cache.chat_lines,
								flood: {
									count: cache.flood.count,
									protected: cache.flood.protected,
									time: cache.flood.time,
								},
								cache_timer: timestamp,
								live: null,
								game: cache.game || null,
								uptime: null,
								title: null,
								viewers: null,
								started_at: null,
								stream_id: null,
								last_db_update: timestamp,
								timering: cache.timering,
								last_command: cache.last_command,
								last_gamble: cache.last_gamble,
								active_users: cache.active_users,
								active_user_list: cache.active_user_list,
								gainer_time: cache.gainer_time,
							};

							if (await cacheClient.set(channel, cache)) {
								logger.debug(`Updating cache for ${channel}..`);
								return cache;
							}
						}
					} else {
						// offline

						cache = {
							channel: channel,
							chat_lines: cache.chat_lines,
							flood: {
								count: cache.flood.count,
								protected: cache.flood.protected,
								time: cache.flood.time,
							},
							cache_timer: timestamp,
							live: null,
							game: cache.game || null,
							uptime: null,
							title: null,
							viewers: null,
							started_at: null,
							stream_id: null,
							last_db_update: timestamp,
							timering: cache.timering,
							last_command: cache.last_command,
							last_gamble: cache.last_gamble,
							active_users: cache.active_users,
							active_user_list: cache.active_user_list,
							gainer_time: cache.gainer_time,
						};

						if (await cacheClient.set(channel, cache)) {
							logger.debug(`Updating cache for ${channel}..`);
							return cache;
						}
					}
				})
				.then((cache) => cache);
		}

		if (cache.flood.time == timestamp && !context.mod) {
			if (cache.flood.count > 30) {
				cache.flood.protected = true;
				logger.error(`flood protection enabled for channel ${channel}`);
			}

			cache.flood.count++;

			if (cache.flood.count > 25) {
				logger.error(`flood detected! count: ${cache.flood.count}`);
			}

			if (await cacheClient.set(channel, cache)) {
				return cache;
			}
		} else {
			cache.flood.protected = false;
			cache.flood.count = 0;
			cache.flood.time = timestamp;

			if (await cacheClient.set(channel, cache)) {
				return cache;
			}
		}
	}
}
