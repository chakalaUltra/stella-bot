import { GuildMember } from "discord.js";
import { createEmbed } from "../../utils/embed.js";
import { warningDb } from "../../database/db.js";
import { COLORS, EMOJIS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "userinfo",
  aliases: ["ui", "whois"],
  description: "Get info about a user",
  usage: "s!userinfo [@user]",
  category: "Utility",
  async execute(message, _args) {
    const target = (message.mentions.members?.first() ?? message.member) as GuildMember;
    if (!target) return;

    const user = target.user;
    const warnings = warningDb.count(message.guild!.id, user.id);
    const roles = target.roles.cache
      .filter(r => r.id !== message.guild!.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .slice(0, 8)
      .join(", ") || "None";

    return message.reply({
      embeds: [createEmbed({
        title: `${EMOJIS.INFO} ${user.username}`,
        color: target.displayHexColor !== "#000000" ? parseInt(target.displayHexColor.replace("#", ""), 16) : COLORS.PRIMARY,
        thumbnail: user.displayAvatarURL({ size: 256 }),
        fields: [
          { name: "🆔 User ID", value: `\`${user.id}\``, inline: true },
          { name: "🤖 Bot", value: user.bot ? "Yes" : "No", inline: true },
          { name: "📅 Joined Discord", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: "📅 Joined Server", value: target.joinedAt ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:R>` : "Unknown", inline: true },
          { name: `${EMOJIS.WARN} Warnings`, value: `${warnings}`, inline: true },
          { name: "🏷️ Roles", value: roles },
        ],
      })],
    });
  },
} satisfies PrefixCommand;
