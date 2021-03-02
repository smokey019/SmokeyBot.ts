import { tmiClient } from '../../clients/tmi';
import { getCurrentTime } from '../../utils';
import { GLOBAL_COOLDOWN, PERSONAL_COOLDOWN, getGCD, getPCD } from '../../clients/cache';
import { ChannelSettings } from '../../models/ChannelSettings';
import { webDB } from '../../clients/database';
import { getLogger } from '../../clients/logger';
import { ChatUserstate } from 'tmi.js';

const logger = getLogger('Chat');

/**
 * Twitch Moderation Action
 * @param {string} channel
 * @param {[]} context
 * @param {number} time
 * @param {string} timeout_message
 */
export async function twitchMod(
  channel: string,
  context: ChatUserstate,
  time: number,
  timeout_message: string = null,
): Promise<boolean> {
  const timestamp = getCurrentTime();

  timeout_message =
    timeout_message ||
    `${context.username} timed out for ${time} in ${channel}`;

  timeout_message = timeout_message.replace(
    /(@)?(%NAME%)/i,
    '@' + context['display-name'],
  );
  timeout_message = timeout_message.replace(
    /(@)?(%USER%)/i,
    '@' + context['display-name'],
  );
  timeout_message = timeout_message.replace(/%TIME%/i, time.toString());

  if (time == 0) {
    logger.debug(`/BAN ${context.username} ${timeout_message}`);
    tmiClient.say(channel, `/BAN ${context.username} ${timeout_message}`);
  } else {
    logger.debug(`/TIMEOUT ${context.username} ${time} ${timeout_message}`);
    tmiClient.say(
      channel,
      `/TIMEOUT ${context.username} ${time} ${timeout_message}`,
    );
  }

  const insertLogs = await webDB('logs')
  .insert({
    who_name: context.username,
    user_id: context['user-id'],
    channel_name: channel.replace('#', ''),
    channel_id: context['room-id'],
    logs_where: 'chat',
    logs_what: timeout_message,
    timestamp: timestamp,
    level: 2,
    msgData: JSON.stringify(context),
  });

  if (insertLogs) {
    return true;
  } else {
    return false;
  }
}

/**
 * Send a Twitch Message
 * @param {string} channel
 * @param {string} message
 * @param {[]} context
 * @param {[]} chatter
 * @param {[]} channelSettings
 * @param {[]} cache
 */
export async function sendMessage(
  channel: string,
  message: string,
  context: ChatUserstate,
  channelSettings: ChannelSettings,
): Promise<boolean> {
  const timestamp = getCurrentTime();
  channel = channel.replace('#', '');
  const GCD = await getGCD(channel);
  const PCD = await getPCD(channel + ":" + context['user-id']);

  if (
    (timestamp - PCD >= channelSettings.personal_cooldown &&
      timestamp - GCD >= channelSettings.global_cooldown) ||
    context['user-level'] >= 2
  ) {
    tmiClient.say(channel, message);

    if (context['user-level'] < 2) {

      await GLOBAL_COOLDOWN.set(channel, timestamp);
      await PERSONAL_COOLDOWN.set(channel + ":" + context['user-id'], timestamp);

    }

    return true;

  } else {
    return false;
  }
}
