import type { Guild, TextChannel } from "discord.js";
import { MessageFlags } from "discord.js";
import { box, td, divider, sect, CLR, type V2Reply } from "./ui.js";
import { guildDb } from "../database/db.js";

export interface ModLogOptions {
  action: string;
  color?: number;
  targetTag: string;
  targetId: string;
  targetAvatar?: string | null;
  moderatorId: string;
  reason: string;
  extra?: [string, string][];
}

/**
 * Sends a mod action to the guild's configured log_channel, if one is set.
 * Silently skips if no channel is configured.
 */
export async function sendModLog(guild: Guild, options: ModLogOptions): Promise<void> {
  const settings = guildDb.get(guild.id);
  if (!settings.log_channel) return;

  const logChannel = guild.channels.cache.get(settings.log_channel) as TextChannel | undefined;
  if (!logChannel) return;

  const { action, color = CLR.PRIMARY, targetTag, targetId, targetAvatar, moderatorId, reason, extra } = options;

  const details = [
    `**Target** · ${targetTag}`,
    `**User ID** · \`${targetId}\``,
    `**Moderator** · <@${moderatorId}>`,
    `**Reason** · ${reason}`,
    ...(extra?.map(([k, v]) => `**${k}** · ${v}`) ?? []),
  ].join("\n");

  const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;

  await logChannel.send({
    components: [
      box(color, [
        sect(`## ${action}\n-# ${timestamp}`, targetAvatar),
        divider(),
        td(details),
      ]),
    ],
    flags: MessageFlags.IsComponentsV2,
  } as V2Reply).catch(() => null);
}
