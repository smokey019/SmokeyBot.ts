export interface ChannelSettings {
	id?: number,
	uid?: number,
	channel_id?: number,
	channel_name?: string,
	auto_join?: 0 | 1,
	vip?: 0 | 1,
	alexa_uid?: string,
	oauth?: string,
	refresh_token?: string,
	expires_in?: number,
	commands_enabled?: 0 | 1,
	moderation_enabled?: 0 | 1,
	modded?: 0 | 1,
	subscriber?: 0 | 1,
	subcount_enabled?: 0 | 1,
	action_moderation?: 0 | 1,
	action_moderation_time?: number,
	action_moderation_count?: number,
	action_moderation_msg_on?: 0 | 1,
	action_moderation_msg?: string,
	action_moderation_user_level?: number,
	blacklist_enabled?: 0 | 1,
	blacklist_user_level?: number,
	blacklist_msg_enabled?: 0 | 1,
	blacklist_msg?: string,
	blacklist_to_count?: number,
	enable_timers?: 0 | 1,
	personal_cooldown?: number,
	global_cooldown?: number,
	warning_enabled?: 0 | 1,
	timeout_msg_cooldown?: number,
	global_blacklist_enabled?: 0 | 1,
	symbol_mod_enabled?: 0 | 1,
	symbol_timeout_time?: number,
	symbol_timeout_msg_on?: number,
	symbol_timeout_msg?: string,
	symbol_max?: number,
	symbol_user_level?: number,
	symbol_to_count?: number,
	capital_mod_enabled?: 0 | 1,
	capital_timeout_time?: number,
	capital_timeout_msg_on?: number,
	capital_timeout_msg?: string,
	capital_max?: number,
	capital_user_level?: number,
	caps_to_count?: number,
	long_msg_mod_enabled?: 0 | 1,
	long_msg_timeout_time?: number,
	long_msg_timeout_msg_on?: 0 | 1,
	long_msg_timeout_msg?: string,
	long_msg_max?: number,
	long_msg_user_level?: number,
	long_msg_to_count?: number,
	repetition_mod_enabled?: 0 | 1,
	repetition_timeout_time?: number,
	repetition_timeout_msg_on?: 0 | 1,
	repetition_timeout_msg?: string,
	repetition_max?: number,
	repetition_user_level?: number,
	repetition_to_count?: number,
	max_emote_mod_enabled?: 0 | 1,
	max_emote_timeout_time?: number,
	max_emote_timeout_msg_on?: 0 | 1,
	max_emote_timeout_msg?: string,
	max_emote_max?: number,
	max_emote_user_level?: number,
	max_emote_to_count?: number,
	anti_link_mod_enabled?: 0 | 1,
	anti_link_timeout_time?: number,
	anti_link_timeout_msg_on?: 0 | 1,
	anti_link_timeout_msg?: string,
	anti_link_user_level?: number,
	anti_link_to_count?: number,
	bot_last_msg_time?: number,
	followage_enabled?: 0 | 1,
	mod_followage_enabled?: 0 | 1,
	followage_3rd_party?: 0 | 1,
	followage_offline_only?: 0 | 1,
	enable_points?: 0 | 1,
	point_timer?: number,
	points_on_level?: number,
	points_on_level_amount?: number,
	point_multiplier?: number,
	points_command?: string,
	point_gain_amount?: number,
	points_name?: string,
	points_message?: string,
	points_message_on?: number,
	enable_levels?: number,
	exp_timer?: number,
	exp_amount?: number,
	level_up_message?: string,
	level_message_on?: number,
	level_message?: string,
	duel_enabled?: number,
	enable_gambling?: number,
	gambling_cooldown?: number,
	roll_odds?: number,
	roll_win_message?: string,
	roll_lose_message?: string,
	gamble_offline_only?: number,
	banlist_enabled?: number,
	banlist_msg?: string,
	banlist_msg_enabled?: number,
	spotify_enabled?: number,
	spotify_msg_enabled?: number,
	spotify_msg?: string,
	vip_partners?: number,
	allow_only_broadcaster_clips?: number,
	clip_freedom_user_level?: number,
	permit_time?: number,
	mods_cache_time?: number,
	no_repeats?: number,
	max_repeats?: number,
	commands_case_sensitive?: number,
	giveaway_enabled?: number,
	followage_whispers?: number,
	whispers_enabled?: number,
	followage_whisper_while_online?: number,
	moderators?: any,
	userlist?: any,
	game?: string,
	gambling_minimum?: number,
	spam_protection?: number,
	last_command?: number,
	bit_whitelist_minimum?: number,
	bit_whitelist_minimum_enabled?: number,
	blocked_languages?: any,
	blocked_langs_mod_enabled?: number,
	blocked_langs_timeout_time?: number,
	blocked_langs_timeout_msg_on?: number,
	blocked_langs_timeout_msg?: string,
	blocked_langs_user_level?: number,
	whitelisted_users?: any,
	whitelisted_links?: any,
	block_cyrillic?: number,
	auto_ban_self_advertisement?: number,
	track_mod_actions?: number,
	active_timer?: number,
}