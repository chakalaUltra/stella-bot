import { ChannelType } from "discord.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "serverinfo",
  aliases: ["si", "server"],
  description: "Display server information",
  usage: "s!serverinfo",
  category: "Utility",
  async execute(message) {
    const guild = message.guild!;
    await guild.fetch();
    const text = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voice = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;

    return message.reply({
      embeds: [createEmbed({
        title: `${EMOJIS.CROWN} ${guild.name}`,
        color: COLORS.PRIMARY,
        thumbnail: guild.iconURL({ size: 256 }) ?? undefined,
        fields: [
          { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
          { name: "📅 Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: "👥 Members", value: `${guild.memberCount} (${bots} bots)`, inline: true },
          { name: "📺 Channels", value: `💬 ${text} • 🔊 ${voice}`, inline: true },
          { name: "🎭 Roles", value: `${guild.roles.cache.size - 1}`, inline: true },
          { name: "🚀 Boosts", value: `${guild.premiumSubscriptionCount ?? 0} (Tier ${guild.premiumTier})`, inline: true },
          { name: "🆔 Server ID", value: `\`${guild.id}\`` },
        ],
      })],
    });
  },
} satisfies PrefixCommand;
