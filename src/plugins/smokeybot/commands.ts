import fetch from 'node-fetch';
import { ChatUserstate } from 'tmi.js';
import convert from 'xml-js';
import { ICache, PERMIT_LIST } from '../../clients/cache';
import { botDB } from '../../clients/database';
import { getLogger } from '../../clients/logger';
import { tmiClient } from '../../clients/tmi';
import { ChannelSettings } from '../../models/ChannelSettings';
import { Chatter } from '../../models/Chatter';
import { Commands } from '../../models/Commands';
import { CustomCommands } from '../../models/CustomCommands';
import {
	formatNumber,
	getCurrentTime,
	jsonFetch,
	time_elapsed_string,
} from '../../utils';
import { sendMessage } from './chat';
import { getChatter } from './chatter';
import { addPoints, removePoints } from './gambling';

const logger = getLogger('Commands');

export async function checkCustomCommands(
	channelSettings: ChannelSettings,
	custom_commands: CustomCommands,
	context: ChatUserstate,
	channel: string,
	msg: string,
	commandName: string,
	chatter: Chatter,
	cache: ICache,
): Promise<any> {
	const splitMsg = msg.split(' ');
	const timestamp = getCurrentTime();

	switch (commandName) {
		// "admin" commands

		case '~update-mods':
			tmiClient.say(channel, '.mods');
			logger.info(`doing /mods`);

			break;

		// dynamic stats

		case '!rank':
		case '~rank':
			break;

		// public commands url

		case '!commands':
		case custom_commands.commands:
			if (custom_commands.commands_enabled) {
				// @%SENDER%, commands list for this channel: https://bot.smokey.gg/commands/%CHANNEL%

				if (splitMsg.length > 1) {
					custom_commands.commands_message = custom_commands.commands_message.replace(
						/%SENDER%/gm,
						splitMsg[1].replace('@', ''),
					);
				} else {
					custom_commands.commands_message = custom_commands.commands_message.replace(
						/%SENDER%/gm,
						context['display-name'],
					);
				}

				custom_commands.commands_message = custom_commands.commands_message.replace(
					/%CHANNEL%/gm,
					channel,
				);

				logger.info(custom_commands.commands_message);

				sendMessage(
					channel,
					custom_commands.commands_message,
					context,
					channelSettings,
				);

				return;
			}

			break;

		case '!google':
			// https://www.google.com/?q=google+search+api&oq=google+search+api

			/*let splitLimit = explode(msg, " ", 3);;

      if (splitLimit.length == 3) {

        const search = encodeURI(splitLimit[2]);
        const tempUser = splitLimit[1].replace("@", "");

        sendMessage(channel, `Hey @${tempUser} let me do the hard work for you :) - https://www.google.com/?q=${search}`, context, chatter, channelSettings, cache);
        return;

      }*/

			break;

		// public leaderboard url

		case '!leaderboard':
		case custom_commands.leaderboard:
			if (custom_commands.leaderboard_enabled) {
				if (splitMsg.length > 1) {
					custom_commands.leaderboard_message = custom_commands.leaderboard_message.replace(
						/%SENDER%/gm,
						splitMsg[1].replace('@', ''),
					);
				} else {
					custom_commands.leaderboard_message = custom_commands.leaderboard_message.replace(
						/%SENDER%/gm,
						context['display-name'],
					);
				}

				custom_commands.leaderboard_message = custom_commands.leaderboard_message.replace(
					/%CHANNEL%/gm,
					channel,
				);

				sendMessage(
					channel,
					custom_commands.leaderboard_message,
					context,
					channelSettings,
				);
				return;
			}

			break;

		// channel uptime

		case '!uptime':
		case custom_commands.uptime:
			if (custom_commands.uptime_enabled) {
				const uptime = cache.uptime;

				if (!uptime) {
					// offline

					if (splitMsg.length > 1) {
						custom_commands.uptime_message_offline = custom_commands.uptime_message_offline.replace(
							/%SENDER%/gm,
							splitMsg[1].replace('@', ''),
						);
					} else {
						custom_commands.uptime_message_offline = custom_commands.uptime_message_offline.replace(
							/%SENDER%/gm,
							context['display-name'],
						);
					}

					custom_commands.uptime_message_offline = custom_commands.uptime_message_offline.replace(
						/%CHANNEL%/gm,
						channel,
					);

					logger.info(custom_commands.uptime_message_offline);

					sendMessage(
						channel,
						custom_commands.uptime_message_offline,
						context,
						channelSettings,
					);
				} else {
					// online

					if (splitMsg.length > 1) {
						custom_commands.uptime_message = custom_commands.uptime_message.replace(
							/%SENDER%/gm,
							splitMsg[1].replace('@', ''),
						);
					} else {
						custom_commands.uptime_message = custom_commands.uptime_message.replace(
							/%SENDER%/gm,
							context['display-name'],
						);
					}

					const humanTime = time_elapsed_string(uptime.started_at);

					custom_commands.uptime_message = custom_commands.uptime_message.replace(
						/%UPTIME%/gm,
						humanTime,
					);

					custom_commands.uptime_message = custom_commands.uptime_message.replace(
						/%CHANNEL%/gm,
						channel,
					);

					logger.info(custom_commands.uptime_message);

					sendMessage(
						channel,
						custom_commands.uptime_message,
						context,
						channelSettings,
					);
				}
			}

			break;

		// followage

		case '!followage':
		case custom_commands.followage:
			if (channelSettings.followage_enabled) {
				const live = cache.live;

				// @%USER% doesn't follow the channel.
				// @%SENDER%, you've been following the channel for %FOLLOWAGE%.

				if (
					(channelSettings.followage_offline_only && !live) ||
					!channelSettings.followage_offline_only ||
					context['user-level'] >= 2
				) {
					jsonFetch(
						`https://api.smokey.gg/twitch/follows/${context['room-id']}/${context['user-id']}/${context['room-id']}`,
					).then((followage: any) => {
						const humanTime = time_elapsed_string(followage._data.followed_at);

						custom_commands.followage_message = parseOutgoingMsg(
							context,
							custom_commands.followage_message,
							msg,
						);
						custom_commands.followage_message = custom_commands.followage_message.replace(
							'%FOLLOWAGE%',
							humanTime,
						);

						sendMessage(
							channel,
							custom_commands.followage_message,
							context,
							channelSettings,
						);
					});
				}
			}

			break;

		// update game and/or show what game user is playing

		case '!game':
		case custom_commands.game:
			if (custom_commands.game_enabled) {
				if (context['user-level'] < 2) {
					if (!cache.game) {
						// offline
						sendMessage(
							channel,
							`@${context['display-name']} - This channel is offline.`,
							context,
							channelSettings,
						);
						return;
					} else {
						let response = parseOutgoingMsg(
							context,
							custom_commands.game_message,
							msg,
						);
						response = response.replace(/%GAME_TITLE%/i, cache.game);
						response = response.replace(/%CHANNEL%/i, channel);

						sendMessage(channel, response, context, channelSettings);
						return;
					}
				}
			}

			break;

		// update title and/or show what the title is

		case '!title':
		case custom_commands.title:
			if (custom_commands.title_enabled) {
				if (context['user-level'] < 2) {
					if (!cache.title) {
						// offline
						sendMessage(
							channel,
							`@${context['display-name']} - This channel is offline.`,
							context,
							channelSettings,
						);
						return;
					} else {
						await sendMessage(
							channel,
							`@${context['display-name']} - ${channel}'s title: ${cache.title}`,
							context,
							channelSettings,
						);
						return;
					}
				}
			}

			break;

		// spotify connection

		case '!song':
			if (channelSettings.spotify_enabled) {
				const spotifyAPI = await jsonFetch(
					`https://bot.smokey.gg/api/spotify/?channel_id=${context['user-id']}`,
				);

				await sendMessage(
					channel,
					`@${context['display-name']}, ` + spotifyAPI.data,
					context,
					channelSettings,
				);
			}

			break;

		// gambling

		case '!gamble':
		case '!roulette':
		case '!roll':
			if (
				(channelSettings.enable_gambling &&
					timestamp - chatter.last_gamble >=
						channelSettings.gambling_cooldown) ||
				(channelSettings.enable_gambling && context.mod)
			) {
				const live = cache.live;

				if (
					(channelSettings.gamble_offline_only && !live) ||
					!channelSettings.gamble_offline_only
				) {
					const minimum = channelSettings.gambling_minimum;
					let gamble = 0;

					if (!gamble) return;

					if (splitMsg[1] == 'all') {
						gamble = chatter.points;
					} else if (splitMsg[1].match(/\dk/i)) {
						splitMsg[1] = splitMsg[1].replace(/k/i, '');
						gamble = parseInt(splitMsg[1]);
						gamble = gamble * 1000;
					} else if (splitMsg[1].match(/\dm/i)) {
						splitMsg[1] = splitMsg[1].replace(/m/i, '');
						gamble = parseInt(splitMsg[1]);
						gamble = gamble * 1000000;
					} else if (splitMsg[1].match(/\db/i)) {
						splitMsg[1] = splitMsg[1].replace(/b/i, '');
						gamble = parseInt(splitMsg[1]);
						gamble = gamble * 1000000000;
					} else if (splitMsg[1] == 'half') {
						gamble = parseInt(splitMsg[1]);
						gamble = chatter.points / 2;
					}

					if (chatter.points >= gamble && gamble >= minimum && gamble > 0) {
						const roll = Math.floor(Math.random() * 100 + 0);

						if (roll >= channelSettings.roll_odds) {
							// win
							// /me FeelsGoodMan @%NAME% rolled %ROLL% and won %POINTSWON% %POINTSNAME%! You now have %POINTS% total. FeelsGoodMan

							const newPoints = chatter.points + gamble;

							let response = channelSettings.roll_win_message;
							response = response.replace(
								/\\%NAME\\%/gm,
								context['display-name'],
							);
							response = response.replace(/\\%ROLL\\%/gm, roll.toString());
							response = response.replace(
								/\\%POINTSWON\\%/gm,
								formatNumber(gamble),
							);
							response = response.replace(
								/\\%POINTSNAME\\%/gm,
								channelSettings.points_name,
							);
							response = response.replace(
								/\\%POINTS\\%/gm,
								formatNumber(newPoints),
							);

							// update chatter points
							logger.info(response);
							await sendMessage(channel, response, context, channelSettings);
							addPoints(context, context.username, gamble);
						} else if (roll == 100 || roll == 0) {
							// triple win

							const newPoints = chatter.points + gamble * 3;

							let response = channelSettings.roll_win_message;
							response = response.replace(
								/\\%NAME\\%/gm,
								context['display-name'],
							);
							response = response.replace(/\\%ROLL\\%/gm, roll.toString());
							response = response.replace(
								/\\%POINTSWON\\%/gm,
								formatNumber(gamble * 3),
							);
							response = response.replace(
								/\\%POINTSNAME\\%/gm,
								channelSettings.points_name,
							);
							response = response.replace(
								/\\%POINTS\\%/gm,
								formatNumber(newPoints),
							);

							// update chatter points
							logger.info(response);
							sendMessage(channel, response, context, channelSettings);
							addPoints(context, context.username, gamble * 3);
						} else {
							// loss
							// /me FeelsBadMan @%NAME% rolled %ROLL% and lost %POINTSLOST% %POINTSNAME%! You now have %POINTS% total. FeelsBadMan

							const newPoints = chatter.points - gamble;

							let response = channelSettings.roll_lose_message;
							response = response.replace(
								/\\%NAME\\%/gm,
								context['display-name'],
							);
							response = response.replace(/\\%ROLL\\%/gm, roll.toString());
							response = response.replace(
								/\\%POINTSLOST\\%/gm,
								formatNumber(gamble),
							);
							response = response.replace(
								/\\%POINTSNAME\\%/gm,
								channelSettings.points_name,
							);
							response = response.replace(
								/\\%POINTS\\%/gm,
								formatNumber(newPoints),
							);

							// update chatter points
							logger.info(response);
							await sendMessage(channel, response, context, channelSettings);
							removePoints(context, context.username, gamble);
						}
					}

					if (splitMsg[1] == 'help') {
						const tmpHelp = `!gamble #, !roulette #, !roll #, !give USER # - Channel minimum: ${formatNumber(
							minimum,
						)} - You have ${formatNumber(chatter.points)} ${
							channelSettings.points_name
						}`;
						await sendMessage(channel, tmpHelp, context, channelSettings);
					}
				}
			} else if (
				timestamp - chatter.last_gamble <
				channelSettings.gambling_cooldown
			) {
				logger.info(
					`Gambling cooldown is active ${context.username} in channel ${channel}.`,
				);
			}

			break;

		case '!give':
			if (
				channelSettings.enable_gambling ||
				(channelSettings.enable_gambling && context['user-level'] >= 2)
			) {
				const live = cache.live;

				if (
					(channelSettings.gamble_offline_only && !live) ||
					!channelSettings.gamble_offline_only
				) {
					const minimum = channelSettings.gambling_minimum;

					let gamble = 0;

					if (splitMsg[2] == 'all') {
						gamble = chatter.points;
					} else if (splitMsg[2].match(/\dk/i)) {
						splitMsg[2] = splitMsg[2].replace(/k/i, '');
						gamble = parseInt(splitMsg[2]);
						gamble = gamble * 1000;
					} else if (splitMsg[2].match(/\dm/i)) {
						splitMsg[1] = splitMsg[2].replace(/m/i, '');
						gamble = parseInt(splitMsg[2]);
						gamble = gamble * 1000000;
					} else if (splitMsg[2].match(/\db/i)) {
						splitMsg[1] = splitMsg[2].replace(/b/i, '');
						gamble = parseInt(splitMsg[2]);
						gamble = gamble * 1000000000;
					} else if (splitMsg[2] == 'half') {
						gamble = parseInt(splitMsg[2]);
						gamble = chatter.points / 2;
					}

					splitMsg[1] = splitMsg[1].replace(/@/g, '');

					if (
						splitMsg[1] == 'all' &&
						context['user-level'] == 3 &&
						gamble > 0 &&
						cache.active_users.length > 0 &&
						cache.active_users.length < 500
					) {
						const chat_list = await jsonFetch(
							`https://tmi.twitch.tv/group/user/${channel}/chatters`,
						);

						logger.info(
							`giving all executed by ${context.username} in ${channel}!`,
						);

						logger.info(`total chatters: ` + chat_list['chatter_count']);

						sendMessage(
							channel,
							`@${context['display-name']} is giving ${formatNumber(
								cache.active_users.length,
							)} users ${formatNumber(gamble)} points!`,
							context,
							channelSettings,
						);

						for (const key in chat_list['chatters']['broadcaster']) {
							if (
								!cache.active_user_list.includes(
									chat_list['chatters']['broadcaster'][key],
								)
							) {
								addPoints(
									context,
									chat_list['chatters']['broadcaster'][key],
									gamble,
								);
							}
						}

						for (const key in chat_list['chatters']['moderators']) {
							//logger.info(`attempting to add points to: ` + chat_list["chatters"]["moderators"][key] + ` in channel ` + target);
							if (
								!cache.active_user_list.includes(
									chat_list['chatters']['moderators'][key],
								)
							) {
								addPoints(
									context,
									chat_list['chatters']['moderators'][key],
									gamble,
								);
							}
						}

						for (const key in chat_list['chatters']['vips']) {
							if (
								!cache.active_user_list.includes(
									chat_list['chatters']['vips'][key],
								)
							) {
								addPoints(context, chat_list['chatters']['vips'][key], gamble);
							}
						}

						for (const key in cache.active_users) {
							addPoints(context, cache.active_users[key].username, gamble);
						}

						logger.info(`jobs done!`);
					} else if (
						splitMsg[1].toLowerCase() != context.username &&
						gamble > 0 &&
						gamble < 99999999999999
					) {
						const recipient = await getChatter(
							splitMsg[1].toLowerCase(),
							context['room-id'],
						);

						if (recipient) {
							if (chatter.points >= gamble && gamble >= minimum && gamble > 0) {
								logger.info(
									`${chatter.display_name} has given ${recipient.display_name} ${gamble} points.`,
								);
								sendMessage(
									channel,
									`@${chatter.display_name} has given @${
										recipient.display_name
									} ${formatNumber(gamble)} ${channelSettings.points_name}s.`,
									context,
									channelSettings,
								);
								addPoints(context, recipient.twitch_name, gamble);
								removePoints(context, context.username, gamble);
							}
						} else {
							logger.info(`User doesn't exist, make them chat first!`);
							sendMessage(
								channel,
								`@${context['display-name']}, user doesn't exist. Make them chat first!`,
								context,
								channelSettings,
							);
						}
					}
				}
			}

			break;

		case '!points':
		case channelSettings.points_command:
			if (
				(channelSettings.enable_gambling &&
					channelSettings.gamble_offline_only &&
					!cache.live) ||
				(!channelSettings.gamble_offline_only &&
					channelSettings.enable_gambling)
			) {
				const live = cache.live;

				if (
					(channelSettings.gamble_offline_only && !live) ||
					!channelSettings.gamble_offline_only
				) {
					sendMessage(
						channel,
						`@${context['display-name']} you have ${formatNumber(
							chatter.points,
						)} ${channelSettings.points_name} available.`,
						context,
						channelSettings,
					);
				}
			}

			break;

		// permit user from being timed out

		case '!permit':
		case '!allow':
		case custom_commands.permit:
			if (custom_commands.permit_enabled && context['user-level'] >= 2) {
				let lowUser = splitMsg[1].toLowerCase();
				lowUser = lowUser.replace(/\\@/i, '');

				const permitted = await PERMIT_LIST.get(
					lowUser + ':' + context['room-id'],
				);

				if (!permitted) {
					await PERMIT_LIST.set(
						lowUser + ':' + context['room-id'],
						true,
						channelSettings.permit_time * 1000,
					);
					logger.info(
						`User ${context.username} permitted ${lowUser} in channel ${channel} for ${channelSettings.permit_time} seconds`,
					);
					tmiClient.say(
						channel,
						`@${lowUser} you can post a link for ${channelSettings.permit_time} seconds!`,
					);
				}
			}

			break;
	}
}

export async function checkCommand(
	commands: Array<Commands>,
	msg: string,
	context: ChatUserstate,
	target: string,
	channelSettings: ChannelSettings,
	cache: ICache,
): Promise<boolean> {
	const splitMsg = msg.slice(0).split(' ');
	const commandName = splitMsg[0];

	for (let i = 0; i < commands.length; i++) {
		if (
			(commands[i].name == commandName &&
				commands[i].active &&
				!commands[i].game &&
				context['user-level'] >= commands[i].user_level) ||
			(commands[i].name == commandName &&
				commands[i].active &&
				commands[i].game == cache.game &&
				context['user-level'] >= commands[i].user_level)
		) {
			let response = commands[i].response;

			if (!response.match(/\\%LATESTYOUTUBE\\%/gm)) {
				const reference_check = response.split(' ');

				if (reference_check[0] == '%REFERENCES') {
					//var regex = new RegExp(channelSettings.whitelisted_links[i], "i");

					reference_check[2] = reference_check[2].replace(/%/g, '');

					for (let z = 0; z < commands.length; z++) {
						if (
							commands[z].name == '!' + reference_check[2] ||
							commands[z].name == reference_check[2]
						) {
							update_command_count(commands[i].id);

							commands[i] = commands[z];
							response = commands[z].response;

							break;
						}
					}
				}

				response = parseOutgoingMsg(context, response, msg);
				response = response.replace(
					/\\%COUNT\\%/gm,
					(commands[i].count + 1).toString(),
				);

				sendMessage(target, response, context, channelSettings);
				logger.info(
					`Command sent - Channel: ${target} Command: ${commandName} Response: ${response} Count: ${commands[i].count}`,
				);
			} else {
				const splitYT = response.split('%');

				const YouTube_Data = {
					id: '',
					title: '',
					URL: '',
					channelID: splitYT[2],
				};

				fetch(
					'https://www.youtube.com/feeds/videos.xml?channel_id=' + splitYT[2],
				)
					.then((response) => response.text())
					.then((str) =>
						JSON.parse(convert.xml2json(str, { compact: true, spaces: 4 })),
					)
					.then((dataAsJson) => {
						YouTube_Data.id = dataAsJson.feed.entry[0]['yt:videoId']._text;
						YouTube_Data.title = dataAsJson.feed.entry[0].title._text;
						YouTube_Data.URL = 'https://youtu.be/' + YouTube_Data.id;

						response =
							target +
							"'s latest YouTube Video: '" +
							YouTube_Data.title +
							"' - " +
							YouTube_Data.URL;

						sendMessage(target, response, context, channelSettings);
						logger.info(
							`Command sent - Channel: ${target} Command: ${commandName} Response: ${response}`,
						);
					});
			}

			update_command_count(commands[i].id);

			return true;
		}
	}
}

export async function update_command_count(id: number): Promise<number> {
	const update_command = botDB('commands')
		.where('id', '=', id)
		.increment('count', 1);

	return update_command;
}

export function parseOutgoingMsg(
	context: ChatUserstate,
	response: string,
	msg = undefined,
	timer = false,
): string {
	if (!timer && msg) {
		const who = context['display-name'];
		const splitMsg = msg.split(' ');

		if (splitMsg.length > 1) {
			const at = splitMsg[1].replace('@', '');

			response = response.replace(/(@)?(%LOWER%INDEX1%%)/gm, at);
			response = response.replace(/(%SENDER%)/gm, at);
			response = response.replace(/(%USER%)/gm, at);
			response = response.replace(/(%SENDERNAME%)/gm, '@' + at);
			response = response.replace(/(%NAME%)/gm, '@' + at);
		} else {
			response = response.replace(/(@)?(%LOWER%INDEX1%%)/gm, who);
			response = response.replace(/(%SENDER%)/gm, who);
			response = response.replace(/(%USER%)/gm, who);
			response = response.replace(/(%SENDERNAME%)/gm, '@' + who);
			response = response.replace(/(%NAME%)/gm, '@' + who);
		}
	} else {
		response = response.replace(/(@)?(%SENDER%)(\\,)?/gm, '');
		response = response.replace(/(@)?(%USER%)(\\,)?/gm, '');
		response = response.replace(/(%SENDERNAME%)(\\,)?/gm, '');
		response = response.replace(/(@)?(%LOWER%INDEX1%%)(\\,)?/gm, '');
		response = response.replace(/(%NAME%)(\\,)?/gm, '');
	}

	return response;
}
