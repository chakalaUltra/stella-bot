import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { permissionDb } from "../database/db.js";
import { errReply } from "./ui.js";

export async function checkPermissions(
  interaction: ChatInputCommandInteraction,
  requiredPerms: bigint[],
  commandName?: string
): Promise<boolean> {
  const member = interaction.member as GuildMember;
  if (!member || !interaction.guild) return false;

  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  if (commandName && interaction.guildId) {
    const roleIds = member.roles.cache.map(r => r.id);
    const access = permissionDb.checkAccess(interaction.guildId, commandName, roleIds);

    if (access === false) {
      await interaction.reply({ ...errReply("You don't have permission to use this command."), ephemeral: true });
      return false;
    }

    if (access === true) return true;
  }

  for (const perm of requiredPerms) {
    if (!member.permissions.has(perm)) {
      const permName = Object.entries(PermissionFlagsBits)
        .find(([, v]) => v === perm)?.[0] ?? "Unknown Permission";

      await interaction.reply({
        ...errReply(`You need the **${permName}** permission to use this command.`),
        ephemeral: true,
      });
      return false;
    }
  }

  return true;
}

export async function checkBotPermissions(
  interaction: ChatInputCommandInteraction,
  requiredPerms: bigint[]
): Promise<boolean> {
  const botMember = interaction.guild?.members.me;
  if (!botMember) return false;

  for (const perm of requiredPerms) {
    if (!botMember.permissions.has(perm)) {
      const permName = Object.entries(PermissionFlagsBits)
        .find(([, v]) => v === perm)?.[0] ?? "Unknown Permission";

      await interaction.reply({
        ...errReply(`I need the **${permName}** permission to do that.`),
        ephemeral: true,
      });
      return false;
    }
  }

  return true;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const [, amount, unit] = match;
  const n = parseInt(amount!, 10);

  switch (unit!.toLowerCase()) {
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "d": return n * 24 * 60 * 60 * 1000;
    default: return null;
  }
}
