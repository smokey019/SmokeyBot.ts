import { ICache } from '../../clients/cache';
import { getCurrentTime } from '../../utils';
import { ChatUserstate } from 'tmi.js';
import { Commands } from '../../models/Commands';
import { Timers } from '../../models/Timers';
import { getLogger } from '../../clients/logger';
import { update_command_count, parseOutgoingMsg } from './commands';
import { botDB } from '../../clients/database';
import { tmiClient, CHATLINES } from '../../clients/tmi';
import Keyv from 'keyv';

const LAST_TIMER = new Keyv({ namespace: 'LAST_TIMER' });
const TIMER_TIME = new Keyv({ namespace: 'TIMER_TIME' });
export const TIMERING = new Keyv({ namespace: 'TIMERING' });

const logger = getLogger('Timers');

export async function checkTimers(
	channel: string,
	timers: Array<Timers>,
	cache: ICache,
	context: ChatUserstate,
	commands: Array<Commands>,
): Promise<void> {
	const timestamp = getCurrentTime();
	const timering = (await TIMERING.get(context['room-id'])) || false;
	const chat_lines = (await CHATLINES.get(context['room-id'])) || 0;

	timers.forEach(async (timer) => {
		const timer_timestamp = await TIMER_TIME.get(timer.id.toString()) || (timestamp - timer.timer_interval);
		if (
			timer.active &&
			chat_lines >= timer.timer_chat_lines &&
			timestamp - timer_timestamp >= timer.timer_interval &&
			!timering
		) {
			await TIMERING.set(context['room-id'], true);
			await TIMER_TIME.set(timer.id.toString(), timestamp);

			const timer_list = JSON.parse(timer.timer_list) || [];

			const currentTimer = (await LAST_TIMER.get(timer.id.toString())) || 0;
			let timer_command: Commands = undefined;

			/**
			 * find command-timer data
			 */

			commands.forEach((cmd: Commands) => {
				if (cmd.id == timer_list[currentTimer]) {
					timer_command = cmd;
				}
			});

			logger.debug(
				`Timer Activated: ${
					timer.timer_name
				} - Lines: ${chat_lines} - ${currentTimer}/${timer_list.length - 1}`,
			);

			if (
				timer_command &&
				timer_command.channel_id.toString() == context['room-id']
			) {
				if (timer_command.command_mode == 1 && !cache.uptime) {
					logger.debug('timer activated but online only');
					await TIMERING.delete(context['room-id']);
				} else {
					/**
					 * update timer count
					 */

					await update_command_count(timer_list[currentTimer]);

					/**
					 * send timer
					 */

					let response = parseOutgoingMsg(
						context,
						timer_command.response.replace(
							/\\%COUNT\\%/gm,
							(timer_command['count'] + 1).toString(),
						),
						undefined,
						true,
					);

					const reference_check = response.split(' ');

					if (reference_check[0] == '%REFERENCES') {
						reference_check[2] = reference_check[2].replace(/%/g, '');

						for (let z = 0; z < commands.length; z++) {
							if (
								commands[z].name == '!' + reference_check[2] ||
								commands[z].name == reference_check[2]
							) {
								timer_command = commands[z];
								response = commands[z].response;
							}
						}
					}

					if (await tmiClient.say(channel, response)) {
						logger.info(
							`Timer sent - Channel: ${channel} Command: ${timer_command.name} Response: ${response} Count: ${timer.count}`,
						);

						/**
						 * update timer data
						 */

						if (
							currentTimer + 1 > timer_list.length - 1 ||
							(currentTimer == 0 && timer_list.length == 1)
						) {
							/**
							 * reset timer data
							 */
							try {
								await botDB<Timers>('timers')
									.where('id', '=', timer.id)
									.increment('count', 1);
								await LAST_TIMER.delete(timer.id.toString());
								await CHATLINES.set(context['room-id'], 0);
								await TIMERING.delete(context['room-id']);
								logger.debug(
									`Successfully updated timer ${timer.id} information.`,
								);
							} catch (error) {
								logger.error(error);
							}
						} else {
							/**
							 * increment timer data
							 */
							try {
								await botDB<Timers>('timers')
									.where('id', '=', timer.id)
									.increment('count', 1);
								await LAST_TIMER.set(timer.id.toString(), currentTimer + 1);
								await CHATLINES.set(context['room-id'], 0);
								await TIMERING.delete(context['room-id']);
								logger.debug(
									`Successfully updated timer ${timer.id} information.`,
								);
							} catch (error) {
								logger.error(error);
							}
						}
					}
				}
			} else {
				/**
				 * reset timer data
				 */
				try {
					await botDB<Timers>('timers')
						.where('id', '=', timer.id)
						.increment('count', 1);
					await LAST_TIMER.delete(timer.id.toString());
					await CHATLINES.set(context['room-id'], 0);
					await TIMERING.delete(context['room-id']);
					logger.debug(`Successfully updated timer ${timer.id} information.`);
				} catch (error) {
					logger.error(error);
				}
			}
		}
	});
}
