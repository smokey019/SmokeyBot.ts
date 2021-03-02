import WebSocket from 'websocket';
import { webDB, botDB } from './database';
import { getLogger } from 'log4js';
import { ChannelSettings } from '../models/ChannelSettings';
const WS_SERVER = 'wss://pubsub-edge.twitch.tv';
const logger = getLogger('PubSub');
let ws;
const heartbeatInterval = 1000 * 30; //ms between PING's
const reconnectInterval = 1000 * 3; //ms to wait before reconnect
const heartbeatHandle = setInterval(heartbeat, heartbeatInterval);

function modListen(channel_id, oauth) {
  const topic = 'chat_moderator_actions.' + channel_id;

  if (oauth) {
    const message = {
      type: 'LISTEN',
      nonce: nonce(15),
      data: {
        topics: [topic],
        auth_token: oauth,
      },
    };
    logger.info('Listening to channel: ' + channel_id);
    ws.send(JSON.stringify(message));
  }
}

export function PubSubConnect(): boolean {
  ws = new WebSocket.w3cwebsocket(WS_SERVER);

  ws.onerror = function(error) {
    logger.error(error);
  };

  ws.onopen = async function() {
    logger.info(`Connected to ${WS_SERVER}!\n`);
    heartbeat();

    const channels = await botDB<ChannelSettings>('user_settings')
      .select()
      .where({ auto_join: 1, track_mod_actions: 1 });

    if (channels) {
      channels.forEach(async (element) => {
        modListen(element.channel_id, element.oauth);
      });
    }
  };

  ws.onclose = function() {
    clearInterval(heartbeatHandle);
    logger.info('PubSub INFO: Reconnecting...\n');
    setTimeout(PubSubConnect, reconnectInterval);
  };

  ws.onmessage = function(e) {
    const message = JSON.parse(e.data.toString());

    if (message.data) {
      const idParse = message.data.topic.split('.');

      const channel_id = idParse[1];
      const data = JSON.parse(message.data.message);

      parse_message(channel_id, data);
    }

    if (message.type == 'RECONNECT') {
      logger.info('PubSub INFO: Reconnecting...\n');
      setTimeout(PubSubConnect, reconnectInterval);
    }
  };
  return true;
}

async function parse_message(channel, data) {
  const timestamp = Math.floor(new Date().getTime() / 1000);
  let logData = undefined;

  data = data.data;

  // logger.info(data);

  switch (data.moderation_action) {
    case 'host':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'host',
			args: [ 'lord_kebun' ],
			created_by: 'summit1g',
			created_by_user_id: '26490481',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Hosted a channel: ${data.args[0]}.`,
        target_user_login: data.args[0],
        timestamp: timestamp,
        type: 2,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'emoteonly':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'emoteonly',
			args: null,
			created_by: 'jeamaf',
			created_by_user_id: '208983081',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Enabled emote only mode.`,
        timestamp: timestamp,
        type: 2,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'emoteonlyoff':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'emoteonlyoff',
			args: null,
			created_by: 'jeamaf',
			created_by_user_id: '208983081',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Disabled emote only mode.`,
        timestamp: timestamp,
        type: 2,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'followersoff':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'followersoff',
			args: null,
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Disabled follower only mode.`,
        timestamp: timestamp,
        type: 2,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'followers':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'followers',
			args: [ '0' ],
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_time: data.args[0],
        timeout_reason: `Enabled follower only mode.`,
        timestamp: timestamp,
        type: 2,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'subscribersoff':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'subscribersoff',
			args: null,
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Disabled subscriber only mode.`,
        timestamp: timestamp,
        type: 2,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'subscribers':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'subscribers',
			args: null,
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Enabled subscriber only mode.`,
        timestamp: timestamp,
        type: 2,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'approved_automod_message':
      /*{ type: 'chat_login_moderation',
			moderation_action: 'approved_automod_message',
			args: [ 'botma_1' ],
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: 'ba4791d8-7000-491f-813f-c58001476d24',
			target_user_id: '133297384',
			target_user_login: 'botma_1',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        msg_id: data.msg_id,
        target_user_id: data.target_user_id,
        target_user_login: data.args[0],
        timeout_reason: `Approved ${data.args[0]}'s held message. msg_id: '${data.msg_id}'`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'delete_permitted_term':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'delete_permitted_term',
			args: [ 'abitch' ],
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Deleted permitted term: '${data.args[0]}'`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'add_permitted_term':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'add_permitted_term',
			args: [ 'suck your penis' ],
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: true }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Added permitted term: '${data.args[0]}'`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'modified_automod_properties':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'modified_automod_properties',
			args: null,
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `User modified automod filter settings.`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'add_blocked_term':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'add_blocked_term',
			args: [ 'this is a test lol' ],
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Added blocked term: '${data.args[0]}'`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'delete_blocked_term':
      /*{ type: 'chat_channel_moderation',
			moderation_action: 'delete_blocked_term',
			args: [ 'this is a test lol' ],
			created_by: 'smokey',
			created_by_user_id: '23735682',
			msg_id: '',
			target_user_id: '',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        timeout_reason: `Deleted blocked term: '${data.args[0]}'`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'automod_rejected':
      /*{
				type: 'chat_login_moderation',
					moderation_action: 'automod_rejected',
						args: ['milkjelly1', 'riotnniggger', 'identity'],
							created_by: '',
								created_by_user_id: '',
									msg_id: '2a5c4e84-465a-49b8-a8ed-31a16af1750b',
										target_user_id: '58958931',
											target_user_login: 'milkjelly1',
												from_automod: false
			}*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: 'AutoMod',
        created_by_user_id: data.created_by_user_id,
        msg_id: data.msg_id,
        target_user_id: data.target_user_id,
        target_user_login: data.args[0],
        timeout_reason: `Held Phrase: '${data.args[1]}' for Reason: '${data.args[2]}'`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'denied_automod_message':
      /*{ type: 'chat_login_moderation',
			moderation_action: 'denied_automod_message',
			args: [ 'milkjelly1' ],
			created_by: 'endjitv',
			created_by_user_id: '76308396',
			msg_id: '2a5c4e84-465a-49b8-a8ed-31a16af1750b',
			target_user_id: '58958931',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        msg_id: data.msg_id,
        target_user_id: data.target_user_id,
        target_user_login: data.args[0],
        timeout_reason: `Denied ${data.args[0]}'s held message. msg_id: '${data.msg_id}'`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 1,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'timeout':
      /*{
				type: 'chat_login_moderation',
					moderation_action: 'timeout',
						args: ['test', '1', ''],
							created_by: 'smokey',
								created_by_user_id: '23735682',
									msg_id: '',
										target_user_id: '12427',
											target_user_login: '',
												from_automod: false
			}*/

      if (data.created_by == 'smokeybot') return;

      logData = {
        moderation_action: data?.moderation_action,
        channel_id: channel,
        args: data?.args,
        created_by: data?.created_by,
        created_by_user_id: data?.created_by_user_id,
        msg_id: data?.msg_id,
        target_user_id: data?.target_user_id,
        target_user_login: data?.args[0],
        timeout_time: data?.args[1],
        timeout_reason: data?.args[2],
        from_automod: data?.from_automod,
        timestamp: timestamp,
        type: 0,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'ban':
      /*{
				type: 'chat_login_moderation',
					moderation_action: 'ban',
						args: ['ganjazulul', ''],
							created_by: 'revengin',
								created_by_user_id: '27047775',
									msg_id: '',
										target_user_id: '63084535',
											target_user_login: '',
												from_automod: false
			}*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        msg_id: data.msg_id,
        target_user_id: data.target_user_id,
        target_user_login: data.args[0],
        timeout_time: 0,
        timeout_reason: data.args[1],
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 0,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'delete':
      /*{
				type: 'chat_login_moderation',
					moderation_action: 'delete',
						args:
				['plant_eater',
					'!acceptkey',
					'7bad0e0a-4e8a-4c7e-b3eb-b32d9e66dac8'],
					created_by: 'endjitv',
						created_by_user_id: '76308396',
							msg_id: '',
								target_user_id: '117211177',
									target_user_login: '',
										from_automod: false
			}*/

      if (data.created_by == 'smokeybot') return;

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        msg_id: data.msg_id || data.args[2],
        target_user_id: data.target_user_id,
        target_user_login: data.args[0],
        timeout_time: 1,
        timeout_reason: `Twitch Purge Button. msg_id: ${data.args[2]}`,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 0,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'unban':
      /*{ type: 'chat_login_moderation',
			moderation_action: 'unban',
			args: [ 'zimonw' ],
			created_by: 'chuck_it',
			created_by_user_id: '94963938',
			msg_id: '',
			target_user_id: '44000642',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        target_user_id: data.target_user_id,
        target_user_login: data.args[0],
        timeout_time: -1,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 0,
      };

      await webDB('moderator_events').insert(logData);

      break;

    case 'untimeout':
      /*{ type: 'chat_login_moderation',
			moderation_action: 'untimeout',
			args: [ 'sympatheticreprise' ],
			created_by: 'xcannon3',
			created_by_user_id: '17604098',
			msg_id: '',
			target_user_id: '183105401',
			target_user_login: '',
			from_automod: false }*/

      logData = {
        moderation_action: data.moderation_action,
        channel_id: channel,
        args: data.args,
        created_by: data.created_by,
        created_by_user_id: data.created_by_user_id,
        target_user_id: data.target_user_id,
        target_user_login: data.args[0],
        timeout_time: -1,
        from_automod: data.from_automod,
        timestamp: timestamp,
        type: 0,
      };

      await webDB('moderator_events').insert(logData);

      break;

    default:
      logger.info('Unknown:', data);
  }
}

// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce(length) {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function heartbeat() {
  const message = {
    type: 'PING',
  };
  ws.send(JSON.stringify(message));
}
