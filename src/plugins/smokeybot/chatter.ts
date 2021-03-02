import { ChatUserstate } from 'tmi.js';
import { botDB } from '../../clients/database';
import { getLogger } from '../../clients/logger';
import { ChannelSettings } from '../../models/ChannelSettings';
import { Chatter, ChatterTable } from '../../models/Chatter';
import { getCurrentTime } from '../../utils';

const logger = getLogger('Chatter');

export async function getChatter(
	username: string,
	channel_id: number | string,
): Promise<Chatter> {
	const chatter = await botDB<Chatter>(ChatterTable)
		.select()
		.where({
			twitch_name: username,
			channel_id: channel_id,
		});

	return chatter[0];
}

/**
 * Get chatter info or insert new chatter data if necessary.
 * @param {*} context
 * @param {*} channel
 * @param {*} msg
 * @param {*} channelSettings
 */
export async function checkChatter(
	context: ChatUserstate,
	channel: string,
	channelSettings: ChannelSettings,
	flood_protection: boolean,
): Promise<Chatter> {
	const timestamp = getCurrentTime();

	if (!flood_protection) {
		const chatter: Chatter = await getChatter(
			context.username,
			context['room-id'],
		);

		if (!chatter) {
			const insertChatter = await botDB<Chatter>(ChatterTable).insert({
				twitch_name: context.username,
				display_name: context['display-name'],
				twitch_id: context['user-id'],
				twitch_channel: channel,
				channel_id: context['room-id'],
				moderator: context.mod,
				color: context.color,
				last_message: timestamp,
				last_command: timestamp - 600,
				last_gamble: timestamp - 600,
				points: channelSettings.point_gain_amount,
				level: 0,
			});

			if (insertChatter) {
				logger.trace(`Inserted new chatter ${context.username} in ${channel}.`);

				return await getChatter(context.username, context['room-id']);
			}
		} else {
			logger.trace(
				`Retrieved old chatter info: ${context.username} in ${channel}.`,
			);

			botDB<Chatter>(ChatterTable)
				.where({
					twitch_id: context['user-id'],
					channel_id: context['room-id'],
				})
				.update({
					moderator: context.mod,
					color: context.color,
					display_name: context['display-name'],
					twitch_name: context.username,
					last_message: timestamp,
				});

			return chatter;
		}
	} else {
		const chatter: Chatter = {
			id: -1,
			twitch_name: context.username,
			display_name: context.username,
			color: null,
			twitch_id: context['user-id'],
			twitch_channel: channel,
			channel_id: context['room-id'],
			last_message: getCurrentTime(),
			last_command: getCurrentTime() - 600,
		};

		return chatter;
	}
}
