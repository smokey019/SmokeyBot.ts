import { botDB } from "../../clients/database";
import { getCurrentTime } from "../../utils";
import { ChatUserstate } from "tmi.js";


export async  function addExp(context: ChatUserstate, user: string, experience: number): Promise<number> {

	if (!user || !experience) return;

	const update_chatter = await botDB('chatters')
		.where({
			channel_id: context['room-id'],
			twitch_name: user.toString().replace(/@/g, '')
		})
		.increment('exp', experience)

	return update_chatter;

}

export async function addPoints(context: ChatUserstate, user: string, points: number): Promise<number> {

	if (!user || !points) return;

	const update_chatter = await botDB('chatters')
		.where({
			channel_id: context['room-id'],
			twitch_name: user.toString().replace(/@/g, '')
		})
		.increment('points', points)
		.update({
			gambling_w_or_l: 1,
			last_gamble: getCurrentTime()
		})

	return update_chatter;

}

export async  function removePoints(context: ChatUserstate, user: string, points: number): Promise<number> {

	if (!user || !points) return;

	const update_chatter = await botDB('chatters')
		.where({
			channel_id: context['room-id'],
			twitch_name: user.toString().replace(/@/g, '')
		})
		.decrement('points', points)
		.update({
			gambling_w_or_l: 0,
			last_gamble: getCurrentTime()
		})

	return update_chatter;

}