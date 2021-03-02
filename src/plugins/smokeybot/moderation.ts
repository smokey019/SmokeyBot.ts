import { ChatUserstate } from 'tmi.js';
import urlRegex from 'url-regex-safe';
import { botDB } from '../../clients/database';
import { getLogger } from '../../clients/logger';
import { BlacklistedWords } from '../../models/BlacklistedWords';
import { ChannelSettings } from '../../models/ChannelSettings';
import { escape_regex, jsonFetch } from '../../utils';
import { twitchMod } from './chat';

const clip_cache = [];

const logger = getLogger('Moderation');

export async function parseModeration(
	channelSettings: ChannelSettings,
	blacklist: Array<BlacklistedWords>,
	context: ChatUserstate,
	msg: string,
	channel: string,
): Promise<any> {
	//phone number regex `(\d{1})*\d{3}(-| |\.)\d{3}(-| |\.)\d{4}`

	if (
		(channelSettings.anti_link_mod_enabled &&
			context['user-level'] < channelSettings.anti_link_user_level) ||
		(channelSettings.anti_link_mod_enabled &&
			channelSettings.anti_link_user_level == 0)
	) {
		const links = msg.match(urlRegex({ strict: false }));

		if (links) {
			await checkLinks(links, context, channel, msg, channelSettings);
		}
	}

	if (
		(channelSettings.long_msg_mod_enabled &&
			!context['emote-only'] &&
			context['user-level'] < channelSettings.long_msg_user_level) ||
		(channelSettings.long_msg_mod_enabled &&
			!context['emote-only'] &&
			channelSettings.long_msg_user_level == 0)
	) {
		if (msg.length > channelSettings.long_msg_max) {
			if (channelSettings.long_msg_timeout_msg_on) {
				await twitchMod(
					channel,
					context,
					channelSettings.long_msg_timeout_time,
					channelSettings.long_msg_timeout_msg,
				);
			} else {
				await twitchMod(
					channel,
					context,
					channelSettings.long_msg_timeout_time,
					channelSettings.long_msg_timeout_msg,
				);
			}

			await botDB<ChannelSettings>('user_settings')
				.where({
					channel_id: context['room-id'],
				})
				.increment('long_msg_to_count', 1);

			return;
		}
	}

	if (
		(channelSettings.action_moderation &&
			context['user-level'] < channelSettings.action_moderation_user_level) ||
		(channelSettings.action_moderation &&
			channelSettings.action_moderation_user_level == 0)
	) {
		if (context['message-type'] == 'action') {
			logger.info('Action message detected!');

			if (channelSettings.action_moderation_msg_on) {
				await twitchMod(
					channel,
					context,
					channelSettings.action_moderation_time,
					channelSettings.action_moderation_msg,
				);
			} else {
				await twitchMod(
					channel,
					context,
					channelSettings.action_moderation_time,
					channelSettings.action_moderation_msg,
				);
			}

			await botDB<ChannelSettings>('user_settings')
				.where({
					channel_id: context['room-id'],
				})
				.increment('action_moderation_count', 1);

			return;
		}
	}

	if (
		(channelSettings.blacklist_enabled &&
			blacklist &&
			context['user-level'] < channelSettings.blacklist_user_level) ||
		(channelSettings.blacklist_enabled &&
			channelSettings.blacklist_user_level == 0)
	) {
		checkBlacklist(blacklist, context, msg, channel, channelSettings);
	}

	if (
		(channelSettings.symbol_mod_enabled &&
			context['user-level'] < channelSettings.symbol_user_level) ||
		(channelSettings.symbol_mod_enabled &&
			channelSettings.symbol_user_level == 0)
	) {
		const symbolCount = msg.match(/\W/gm);

		if (symbolCount) {
			if (symbolCount.length > channelSettings.symbol_max) {
				logger.info(`Symbols detected: ${symbolCount.length}`);

				if (channelSettings.symbol_timeout_msg_on) {
					await twitchMod(
						channel,
						context,
						channelSettings.symbol_timeout_time,
						channelSettings.symbol_timeout_msg,
					);
				} else {
					await twitchMod(
						channel,
						context,
						channelSettings.symbol_timeout_time,
						channelSettings.symbol_timeout_msg,
					);
				}

				await botDB<ChannelSettings>('user_settings')
					.where({
						channel_id: context['room-id'],
					})
					.increment('symbol_to_count', 1);

				return;
			}
		}
	}

	if (
		(channelSettings.capital_mod_enabled &&
			!context['emote-only'] &&
			context['user-level'] < channelSettings.capital_user_level) ||
		(channelSettings.capital_mod_enabled &&
			channelSettings.capital_user_level == 0)
	) {
		const regex = /[A-Z]/g;

		const capsCount = msg.match(regex);

		if (capsCount) {
			if (capsCount.length > channelSettings.capital_max) {
				logger.info(`Caps detected: ${capsCount.length}`);

				if (channelSettings.capital_timeout_msg_on) {
					await twitchMod(
						channel,
						context,
						channelSettings.capital_timeout_time,
						channelSettings.capital_timeout_msg,
					);
				} else {
					await twitchMod(
						channel,
						context,
						channelSettings.capital_timeout_time,
						channelSettings.capital_timeout_msg,
					);
				}

				await botDB<ChannelSettings>('user_settings')
					.where({
						channel_id: context['room-id'],
					})
					.increment('caps_to_count', 1);

				return;
			}
		}
	}

	if (
		(channelSettings.repetition_mod_enabled &&
			context['user-level'] < channelSettings.repetition_user_level) ||
		(channelSettings.repetition_mod_enabled &&
			channelSettings.repetition_user_level == 0)
	) {
		const repetitionCount = msg.match(/(.)\1{2,}/gm);

		if (repetitionCount) {
			for (let i = 0; i < repetitionCount.length; i++) {
				if (repetitionCount[i].length > channelSettings.repetition_max) {
					logger.info(`Repetition detected: ${repetitionCount.length}`);

					if (channelSettings.repetition_timeout_msg_on) {
						await twitchMod(
							channel,
							context,
							channelSettings.repetition_timeout_time,
							channelSettings.repetition_timeout_msg,
						);
					} else {
						await twitchMod(
							channel,
							context,
							channelSettings.repetition_timeout_time,
							channelSettings.repetition_timeout_msg,
						);
					}

					await botDB<ChannelSettings>('user_settings')
						.where({
							channel_id: context['room-id'],
						})
						.increment('repetition_to_count', 1);

					return;
				}
			}
		}
	}

	if (
		(channelSettings.max_emote_mod_enabled &&
			context.emotes &&
			context['user-level'] < channelSettings.max_emote_user_level) ||
		(channelSettings.max_emote_mod_enabled &&
			context.emotes &&
			channelSettings.max_emote_user_level == 0)
	) {
		let emoteCount = 0;

		Object.keys(context.emotes).forEach(function(item) {
			//console.log(context.emotes[item].length); // value
			emoteCount = emoteCount + context.emotes[item].length;
		});

		if (emoteCount > channelSettings.max_emote_max) {
			if (channelSettings.max_emote_timeout_msg_on) {
				await twitchMod(
					channel,
					context,
					channelSettings.max_emote_timeout_time,
					channelSettings.max_emote_timeout_msg,
				);
			} else {
				await twitchMod(
					channel,
					context,
					channelSettings.max_emote_timeout_time,
					channelSettings.max_emote_timeout_msg,
				);
			}

			await botDB<ChannelSettings>('user_settings')
				.where({
					channel_id: context['room-id'],
				})
				.increment('max_emote_to_count', 1);

			return;
		}
	}

	if (
		(channelSettings.blocked_langs_mod_enabled &&
			context['user-level'] < channelSettings.blocked_langs_user_level) ||
		(channelSettings.blocked_langs_mod_enabled &&
			channelSettings.blocked_langs_user_level == 0)
	) {
		if (channelSettings.block_cyrillic) {
			if (msg.match(/[ЁёА-я]/i)) {
				// console.log('Cyrillic detected! ' + msg);
			}
		}
	}
}

export async function checkBlacklist(
	blacklist: Array<BlacklistedWords>,
	context: ChatUserstate,
	msg: string,
	channel: string,
	channelSettings: ChannelSettings,
): Promise<void> {
	for (let i = 0; i < blacklist.length; i++) {
		if (blacklist[i].active) {
			if (blacklist[i].regex) {
				const regexCheck = blacklist[i].content.match('/');

				if (regexCheck) {
					if (msg.match(blacklist[i].content)) {
						logger.info(
							`Blacklisted phrase detected: '${blacklist[i].content}'`,
						);

						if (blacklist[i].custom_reason) {
							await twitchMod(
								channel,
								context,
								blacklist[i].time,
								blacklist[i].custom_reason,
							);
						} else {
							await twitchMod(
								channel,
								context,
								blacklist[i].time,
								channelSettings.blacklist_msg,
							);
						}

						await botDB('blacklisted_words')
							.where({
								id: blacklist[i].id,
							})
							.increment('count', 1);

						await botDB<ChannelSettings>('user_settings')
							.where({
								channel_id: context['room-id'],
							})
							.increment('blacklist_to_count', 1);

						break;
					}
				} else {
					const regex = new RegExp(blacklist[i].content, 'i');

					if (msg.match(regex)) {
						logger.info(
							`Blacklisted phrase detected: '${blacklist[i].content}'`,
						);

						if (blacklist[i].custom_reason) {
							await twitchMod(
								channel,
								context,
								blacklist[i].time,
								blacklist[i].custom_reason,
							);
						} else {
							await twitchMod(
								channel,
								context,
								blacklist[i].time,
								channelSettings.blacklist_msg,
							);
						}

						await botDB('blacklisted_words')
							.where({
								id: blacklist[i].id,
							})
							.increment('count', 1);

						await botDB<ChannelSettings>('user_settings')
							.where({
								channel_id: context['room-id'],
							})
							.increment('blacklist_to_count', 1);

						break;
					}
				}
			} else {
				const regex = new RegExp(escape_regex(blacklist[i].content), 'i');

				if (msg.match(regex)) {
					logger.info(`Blacklisted phrase detected: '${blacklist[i].content}'`);

					if (blacklist[i].custom_reason) {
						await twitchMod(
							channel,
							context,
							blacklist[i].time,
							blacklist[i].custom_reason,
						);
					} else {
						await twitchMod(
							channel,
							context,
							blacklist[i].time,
							channelSettings.blacklist_msg,
						);
					}

					await botDB('blacklisted_words')
						.where({
							id: blacklist[i].id,
						})
						.increment('count', 1);

					await botDB<ChannelSettings>('user_settings')
						.where({
							channel_id: context['room-id'],
						})
						.increment('blacklist_to_count', 1);

					break;
				}
			}
		}
	}
}

export async function checkLinks(
	links: RegExpMatchArray,
	context: ChatUserstate,
	channel: string,
	msg: string,
	channelSettings: ChannelSettings,
): Promise<void> {
	let linkCount = links.length;

	try {
		channelSettings.whitelisted_links = JSON.parse(
			channelSettings.whitelisted_links,
		);
	} catch (error) {
		channelSettings.whitelisted_links = [];
	}

	if (channelSettings.auto_ban_self_advertisement) {
		links.forEach(async (element: string) => {
			if (element.match(context.username) && !element.match('clip')) {
				logger.info(
					`Detected self advertisement in channel ${channel}: ${context.username}`,
				);
				await twitchMod(
					channel,
					context,
					0,
					'Autobanned for self-advertisement.',
				);
			}
		});
	}

	if (channelSettings.whitelisted_links) {
		for (let z = 0; z < channelSettings.whitelisted_links.length; z++) {
			channelSettings.whitelisted_links[z] = channelSettings.whitelisted_links[
				z
			].replace('/./g', '\\.');
			channelSettings.whitelisted_links[z] = channelSettings.whitelisted_links[
				z
			].replace('///g', '\\/');

			const regex = new RegExp(channelSettings.whitelisted_links[z], 'i');

			if (msg.match(regex)) {
				linkCount--;
			}
		}
	}

	if (links) {
		for (let i = 0; i < links.length; i++) {
			if (links[i].match(/clips\.twitch\.tv/i)) {
				const l = links[i].split('/');

				let clipID = l[l.length - 1];

				if (clipID.match(/\?/gim)) {
					const clipSplit = clipID.split('?');
					clipID = clipSplit[0];
				}

				clipID = clipID.replace(/\W+/gm, '');

				logger.info('Clip detected - Clip ID: ' + clipID);

				if (clipID == 'create') {
					break;
				}

				let clip_data = null;

				clip_cache.forEach((element) => {
					if (element.id == clipID) {
						clip_data = element.data;
					}
				});

				if (!clip_data) {
					clip_data = await jsonFetch(
						`https://bot.smokey.gg/api/twitch/?passcode=supersecret&action=clips&oauth=${channelSettings.oauth}&id=${clipID}`,
					);

					if (clip_data.status == 200) {
						clip_cache.push({ id: clipID, data: clip_data });
						logger.info(`New clip added to cache: ${clipID}`);
						logger.info(`Total Clips: ${clip_cache.length}`);

						if (clip_data) {
							if (
								channelSettings.allow_only_broadcaster_clips &&
								clip_data.data.broadcaster_id == context['room-id']
							) {
								linkCount--;
							}
						}
					}
				}
			} else if (links[i].match(/iframe/i)) {
				linkCount++;
			}
		}
	}

	if (linkCount > 0) {
		if (channelSettings.anti_link_timeout_msg_on) {
			await twitchMod(
				channel,
				context,
				channelSettings.anti_link_timeout_time,
				channelSettings.anti_link_timeout_msg,
			);
		} else if (!channelSettings.anti_link_timeout_msg_on) {
			await twitchMod(
				channel,
				context,
				channelSettings.anti_link_timeout_time,
				channelSettings.anti_link_timeout_msg,
			);
		}

		await botDB<ChannelSettings>('user_settings')
			.where({
				channel_id: context['room-id'],
			})
			.increment('anti_link_to_count', 1);
	}

	return;
}
