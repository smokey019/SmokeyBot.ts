import { ChatUserstate } from 'tmi.js';
import { ACTIVE_USER_CACHE, GAINER_TIMER, getDB } from '../../clients/cache';
import { getLogger } from '../../clients/logger';
import { ChannelSettings } from '../../models/ChannelSettings';
import { getCurrentTime } from '../../utils';
import { addExp, addPoints } from './gambling';

const logger = getLogger('Loyalty');
const DO_NOT_ADD = [];

export async function pointsAndexp(
	context: ChatUserstate,
	channel: string,
): Promise<void> {
	const timestamp = getCurrentTime();
	const db = await getDB(channel, context['room-id']);
	const channelSettings: ChannelSettings = db.channelSettings;
	let GAINER_TIME = await GAINER_TIMER.get(context['room-id']);
	let ACTIVE_USERS = await ACTIVE_USER_CACHE.get(context['room-id']);

	if (!GAINER_TIME) {
		GAINER_TIME = timestamp;
		await GAINER_TIMER.set(context['room-id'], timestamp);
	}

	if (!ACTIVE_USERS) {
		ACTIVE_USERS = [];
		await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);
	} else {
		if (!DO_NOT_ADD.includes(context.username + context['room-id'])) {
			ACTIVE_USERS.push({
				username: context.username,
				auto_points_time: timestamp,
				last_talked_time: timestamp,
				last_exp_time: timestamp,
			});
			DO_NOT_ADD.push(context.username + context['room-id']);
			await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);

			logger.trace(
				`Adding active user ${context.username} in channel ${channel}.`,
			);
		}

		if (timestamp - GAINER_TIME > 60) {
			logger.trace(`Checking for point/exp gain in ${channel}..`);

			await GAINER_TIMER.set(context['room-id'], timestamp);

			for (let xd = 0; xd < ACTIVE_USERS.length; xd++) {
				// update timestamp

				if (ACTIVE_USERS[xd].username == context.username) {
					ACTIVE_USERS[xd].last_talked_time = timestamp;
					await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);
				}

				// exp check

				if (channelSettings.enable_levels) {
					if (
						timestamp - ACTIVE_USERS[xd].last_exp_time >
						channelSettings.exp_timer
					) {
						ACTIVE_USERS[xd].last_exp_time = timestamp;
						await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);

						await addExp(
							context,
							ACTIVE_USERS[xd].username,
							channelSettings.exp_amount,
						);
					}
				}

				// points check

				if (channelSettings.enable_points) {
					if (
						timestamp - ACTIVE_USERS[xd].auto_points_time >
							channelSettings.point_timer &&
						timestamp - ACTIVE_USERS[xd].last_talked_time <
							channelSettings.active_timer
					) {
						ACTIVE_USERS[xd].auto_points_time = timestamp;
						await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);

						await addPoints(
							context,
							ACTIVE_USERS[xd].username,
							channelSettings.point_gain_amount,
						);
					} else if (
						timestamp - ACTIVE_USERS[xd].last_talked_time >
							channelSettings.active_timer * 2 &&
						timestamp - ACTIVE_USERS[xd].auto_points_time >
							channelSettings.point_timer
					) {
						// quarter points

						ACTIVE_USERS[xd].auto_points_time = timestamp;
						await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);

						await addPoints(
							context,
							ACTIVE_USERS[xd].username,
							channelSettings.point_gain_amount / 4,
						);
					} else if (
						timestamp - ACTIVE_USERS[xd].last_talked_time >
							channelSettings.active_timer &&
						timestamp - ACTIVE_USERS[xd].auto_points_time >
							channelSettings.point_timer
					) {
						// half points

						ACTIVE_USERS[xd].auto_points_time = timestamp;
						await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);

						await addPoints(
							context,
							ACTIVE_USERS[xd].username,
							channelSettings.point_gain_amount / 2,
						);
					}
				}

				if (timestamp - ACTIVE_USERS[xd].last_talked_time > 3600) {
					logger.trace(
						`Removing inactive user ${ACTIVE_USERS[xd].username} in channel ${channel}.`,
					);
					ACTIVE_USERS.splice(xd, 1);
					await ACTIVE_USER_CACHE.set(context['room-id'], ACTIVE_USERS);
					DO_NOT_ADD.splice(xd, 1);
				}
			}

			logger.debug(`Total active users: ${ACTIVE_USERS.length}`);
		}
	}
}
