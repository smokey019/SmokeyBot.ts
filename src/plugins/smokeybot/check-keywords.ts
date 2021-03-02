import { sendMessage } from "./chat"
import { getLogger } from "../../clients/logger";
import { ChatUserstate } from "tmi.js";
import { ChannelSettings } from "../../models/ChannelSettings";
import { Keywords } from "../../models/Keywords";

const logger = getLogger('Keywords');

export async function checkKeywords(keywords: Array<Keywords>, context: ChatUserstate, target: string, msg: string, channelSettings: ChannelSettings): Promise<void> {

	for (let i = 0; i < keywords.length; i++) {

		if (keywords[i].active) {

			const triggers = JSON.parse(keywords[i].triggers) || [];

			if (!triggers) return;

			Object.keys(triggers).forEach(async function (key) {

				if (msg.match(triggers[key])
				&& triggers[key].toString().trim() != '') {

					logger.info("Keyword triggered:", triggers[key], keywords[i].response)
					sendMessage(target, keywords[i].response, context, channelSettings);

				}

			})

		}

	}

}