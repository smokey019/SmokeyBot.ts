export interface Commands {
  id?: number;
  name?: string;
  response?: string;
  active?: number;
  ignore_cd?: number;
  command_mode?: number;
  user_level?: number;
  count?: number;
  uid?: number;
  creator_id?: number;
  creator_name?: string;
  channel_name?: string;
  channel_id?: number;
  mods_edit?: number;
  created_at?: number;
  used_at?: number;
  game?: string;
  cooldown?: number;
}

export const CommandsTable = 'commands';
