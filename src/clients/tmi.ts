import Keyv from 'keyv';
import tmi, { ChatUserstate, MsgID } from 'tmi.js';
import { getConfigValue } from '../config';
import { BlacklistedWords } from '../models/BlacklistedWords';
import { ChannelSettings } from '../models/ChannelSettings';
import { Commands } from '../models/Commands';
import { CustomCommands } from '../models/CustomCommands';
import { Keywords } from '../models/Keywords';
import { Timers } from '../models/Timers';
import { checkChatter } from '../plugins/smokeybot/chatter';
import { checkKeywords } from '../plugins/smokeybot/check-keywords';
import {
	checkCommand,
	checkCustomCommands,
} from '../plugins/smokeybot/commands';
import { getCache } from '../plugins/smokeybot/get-cache';
import { parseModeration } from '../plugins/smokeybot/moderation';
import { pointsAndexp } from '../plugins/smokeybot/points-and-exp';
import { checkTimers, TIMERING } from '../plugins/smokeybot/timers';
import { getCurrentTime, jsonFetch } from '../utils';
import { getDB, getGCD, getPCD, PERMIT_LIST } from './cache';
import { botDB, getChannels } from './database';
import { getLogger } from './logger';

/**
 * tmiClient initialization
 */
export const tmiClient = tmi.client({
	identity: {
		username: getConfigValue('TMI_USER'),
		password: getConfigValue('TMI_PASSWORD'),
	},
	channels: [],
	connection: {
		port: 443,
		reconnect: true,
	},
});

export const CHATLINES = new Keyv({ namespace: 'CHAT_LINES' });

const logger = getLogger('SmokeyBot.js');

const allChannels = [];
const DEV_MODE = false;

let botStartup = false;
const flood_protection = false;

/**
 * register tmi.js events for handling
 */
tmiClient.on('connected', onConnectedHandler);
tmiClient.on('disconnected', onDisconnectedHandler);
tmiClient.on('notice', onNoticeHandler);
tmiClient.on('join', onJoinHandler);
tmiClient.on('part', onPartHandler);
tmiClient.on('whisper', onWhisperHandler);

/**
 * this looks fancier than it is.
 */
tmiClient.on(
	'message',
	async (
		target: string,
		context: ChatUserstate,
		msg: string,
		self: boolean,
	) => {
		try {
			await parseMessage(target, context, msg, self);
		} catch (error) {
			logger.error(error);
		}
	},
);

/**
 * Parse a Twitch Message(/Whisper?)
 * @param target
 * @param context
 * @param msg
 * @param self
 */
async function parseMessage(
	target: string,
	context: ChatUserstate,
	msg: string,
	self: boolean,
) {
	if (self || context.username === 'smokeybot') {
		return;
	}

	const channel = target.replace('#', '');
	const timestamp = getCurrentTime();
	const cache = await getCache(channel, context);
	const db = await getDB(channel, context['room-id']);
	const GCD = await getGCD(channel);
	const PCD = await getPCD(channel + ':' + context['user-id']);

	context['user-level'] = 0;
	context.message = msg;

	if (!cache || !db) {
		return;
	}

	if (await PERMIT_LIST.get(context.username + ':' + context['room-id'])) {
		context['user-level'] = 2;
		context.mod = true;
		logger.info(
			`${context.username} is permitted in channel ${channel}! Upgrading user level.`,
		);
	}

	const channelSettings: ChannelSettings = db.channelSettings;

	const commands: Commands[] = db.commands;

	const custom_commands: CustomCommands = db.custom_commands;

	const keywords: Keywords[] = db.keywords;

	const timers: Timers[] = db.timers;

	const blacklist: BlacklistedWords[] = db.blacklist;

	const chatter = await checkChatter(
		context,
		channel,
		channelSettings,
		flood_protection,
	);

	if (!flood_protection && channelSettings) {
		/**
		 * points & experience
		 */

		if (channelSettings.enable_points || channelSettings.enable_levels) {
			await pointsAndexp(context, channel);
		}

		/**
		 * upgrade user level
		 */

		if (context.badges) {
			if (context.badges.subscriber) {
				context['user-level'] = 1;
			}

			if (
				context.badges.moderator ||
				(context.badges.partner && channelSettings.vip_partners) ||
				context.badges.vip
			) {
				context['user-level'] = 2;
			}

			if (context.badges.broadcaster) {
				context['user-level'] = 3;
			}

			if (
				context.badges.staff ||
				context.badges.admin ||
				context.badges.global_mod
			) {
				context['user-level'] = 4;
			}
		}

		/**
		 * whitelist from bits?
		 */

		if (context.bits && channelSettings.bit_whitelist_minimum_enabled) {
			if (parseInt(context.bits) > channelSettings.bit_whitelist_minimum) {
				context['user-level'] = 2;
			}
		}
	} else {
		/**
		 * anti bot shit
		 */

		if (context.username.match(/[a-zA-Z]{6}\d{4}[a-zA-Z]{2}/gim)) {
			logger.info(
				`Spammer detected w/ regex: ${context.username} in channel ${target}`,
			);

			if (target == '#summit1g') {
				// twitchMod(target, context, 0, "XD");
				// logger.info(`!!banned spammer ${context.username} in ${target}!!!`);
				return;
			}
		}
	}

	/**
	 * work work
	 *  (need more RAM)
	 */

	if (channelSettings && cache && chatter) {
		/**
		 * moderation features
		 */

		if (
			context['user-level'] < 2 &&
			channelSettings.moderation_enabled &&
			!context.mod &&
			channelSettings.modded
		) {
			await parseModeration(channelSettings, blacklist, context, msg, channel);
		}

		/**
		 * commands & keywords
		 */

		if (
			(timestamp - PCD >= channelSettings.personal_cooldown &&
				timestamp - GCD >= channelSettings.global_cooldown) ||
			context['user-level'] >= 2 ||
			context.mod
		) {
			/**
			 * all commands
			 */

			if (channelSettings.commands_enabled) {
				const splitMsg = msg.split(' ');
				let commandName = splitMsg[0] + '';

				/**
				 * actual custom user commands
				 */

				if (!channelSettings.commands_case_sensitive) {
					commandName = commandName.toLowerCase();
					await checkCommand(
						commands,
						msg.toLowerCase(),
						context,
						target,
						channelSettings,
						cache,
					);
				} else {
					await checkCommand(
						commands,
						msg.trim(),
						context,
						target,
						channelSettings,
						cache,
					);
				}

				/**
				 * uptime/followage/other misc commands
				 * -- probably shouldn't be called custom commands
				 */

				if (custom_commands) {
					await checkCustomCommands(
						channelSettings,
						custom_commands,
						context,
						channel,
						msg,
						commandName,
						chatter,
						cache,
					);
				}
			}

			/**
			 * keywords
			 */

			if (keywords) {
				await checkKeywords(keywords, context, target, msg, channelSettings);
			}
		}

		/**
		 * timers
		 */

		if (timers && !(await TIMERING.get(context['room-id']))) {
			await checkTimers(channel, timers, cache, context, commands);
		}

		/**
		 * increment chat lines
		 */

		let chatLines = (await CHATLINES.get(context['room-id'])) || 0;

		chatLines++;

		await CHATLINES.set(context['room-id'], chatLines);
	} else if (!chatter) {
		logger.warn(`${channel} missing chatter ${context.username}!`);
	} else if (!channelSettings) {
		logger.warn(`${channel} missing channel settings!`);
	} else if (!cache) {
		logger.warn(`${channel} missing channel cache!`);
	}

	// logger.trace(`${target} - ${context['display-name']}: ${msg}`);
}

/**
 * tmi.js connected
 * @param addr
 * @param port
 */
async function onConnectedHandler(addr: string, port: number) {
	const channels = await getChannels(1);

	logger.info(`* Connected to ${addr}:${port}`);

	logger.info(`Joining ${channels.length} channels...`);

	botStartup = true;
	let tempInterval = 5000;

	for (let i = 0; i < channels.length; i++) {
		setTimeout(joinChannel, tempInterval, channels[i]);
		allChannels.push(channels[i].channel_name);
		tempInterval = tempInterval + 2000;
	}

	// set auto join timer

	setTimeout(auto_join_timer, tempInterval);
}

/**
 * Check if a user still exists.
 * @param channel
 */
async function checkProfile(channel: string): Promise<boolean> {
	const user = await jsonFetch(
		`https://api.smokey.gg/twitch/users_by_name/23735682/${channel}`,
	);

	if (!user._data) {
		return false;
	} else {
		return true;
	}
}

/**
 * Join a Twitch channel.
 * @param data
 */
async function joinChannel(data: {
	channel_name: string;
	oauth: string;
	refresh_token: string;
}) {
	const channel = data.channel_name;
	let validUser = undefined;

	if (!channel) {
		return;
	}

	if (DEV_MODE) {
		validUser = true;
	} else {
		validUser = await checkProfile(channel);
	}

	if (validUser) {
		if (!botStartup) {
			logger.info(`Joining ${channel}..`);
		}
		try {
			await tmiClient.join(channel);
		} catch (error) {
			logger.error(error);
		}
	} else {
		const update_settings = await botDB('user_settings')
			.where({
				channel_name: channel.replace(/#/, ''),
			})
			.update({ auto_join: 0 });

		if (update_settings) {
			logger.info(
				`Error joining channel: ${channel}, removed from auto-join list.`,
			);

			for (let i = 0; i < allChannels.length; i++) {
				if (allChannels[i] == channel.replace(/#/gm, '')) {
					allChannels.splice(i, 1);
				}
			}
		}
	}
}

async function auto_join_timer() {
	logger.debug('Checking if we need to leave or join channels..');

	const channels = await getChannels(0);

	for (let i = 0; i < channels.length; i++) {
		if (
			!tmiClient.getChannels().includes('#' + channels[i].channel_name) &&
			channels[i].auto_join
		) {
			logger.info(
				`${channels[i].channel_name} isn't in the channel's list so let's join it..`,
			);
			await tmiClient.join(channels[i].channel_name);
		} else if (
			tmiClient.getChannels().includes('#' + channels[i].channel_name) &&
			!channels[i].auto_join
		) {
			logger.info(
				`${channels[i].channel_name} wants us to leave.. let's leave.`,
			);
			await tmiClient.part(channels[i].channel_name);
		}
	}

	// recall

	const time = 5 * 60000; // minutes * 1 min in ms

	setTimeout(auto_join_timer, time);
}

/**
 * Joined a Twitch channel.
 * @param channel
 * @param nick
 * @param isSelf
 */
function onJoinHandler(channel: string, nick: string, isSelf: boolean) {
	if (isSelf || nick == 'smokeybot') {
		if (!botStartup) {
			logger.info(`Successfully joined channel ${channel}`);
		}

		if (
			tmiClient.getChannels().length == allChannels.length &&
			botStartup == true
		) {
			botStartup = false;
			logger.info(`Joined all channels.  Setting auto join timer.`);
		}
	} else {
		//logger.info(`User ${nick} joined channel ${channel}`);
	}
}

/**
 * Check if we're banned and maybe other future stuff.
 * @param channel
 * @param msgid
 */
async function onNoticeHandler(channel: string, msgid: MsgID) {
	switch (msgid) {
		case 'msg_banned':
			await botDB('user_settings')
				.where({
					channel_name: channel.replace(/#/, ''),
				})
				.update({ auto_join: 0 });

			tmiClient.part(channel);

			logger.info(`We're banned in channel ${channel} so let's leave.`);

			break;

		case 'host_target_went_offline':
			break;
	}
}

/**
 * Received whisper.
 * TODO: Accept commands/respond through whisper?
 * @param from
 * @param userstate
 * @param message
 */
function onWhisperHandler(
	from: string,
	userstate: ChatUserstate,
	message: string,
) {
	logger.info(`Psst, whisper from ${from}: ${message} tags~`);
	logger.info(userstate);
}

function onPartHandler(channel: string, nick: string, isSelf: boolean) {
	if (isSelf || nick == 'smokeybot') {
		logger.info(`Successfully left channel ${channel}`);
	} else {
		//logger.info(`User ${nick} left channel ${channel}`)
	}
}

/**
 * Disconnected from twitch. Reconnect hopefully. (through tmi.js not here)
 * @param reason
 */
function onDisconnectedHandler(reason: string) {
	logger.info(`DISCONNECTED! - Reason: ${reason}`);
}
