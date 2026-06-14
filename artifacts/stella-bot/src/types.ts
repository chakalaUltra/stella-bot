import type {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  AutocompleteInteraction,
} from "discord.js";
import type { StellaClient } from "./client.js";

export interface Command {
  data: SlashCommandBuilder | ContextMenuCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  category: string;
  cooldown?: number;
  execute: (interaction: ChatInputCommandInteraction, client: StellaClient) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction, client: StellaClient) => Promise<void>;
}

export interface GuildSettings {
  guild_id: string;
  prefix: string;
  log_channel: string | null;
  welcome_channel: string | null;
  welcome_message: string | null;
  ticket_category: string | null;
  ticket_log_channel: string | null;
  ticket_support_role: string | null;
  ticket_count: number;
  created_at: number;
}

export interface PrefixCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  category: string;
  cooldown?: number;
  execute: (message: import("discord.js").Message, args: string[], client: import("./client.js").StellaClient) => Promise<unknown>;
}

export interface Warning {
  id: number;
  guild_id: string;
  user_id: string;
  moderator_id: string;
  reason: string;
  created_at: number;
}

export interface Ticket {
  id: number;
  guild_id: string;
  channel_id: string;
  user_id: string;
  ticket_number: number;
  status: "open" | "closed";
  topic: string | null;
  created_at: number;
  closed_at: number | null;
}

export interface CommandPermission {
  id: number;
  guild_id: string;
  command_name: string;
  role_id: string;
  allowed: number;
}
