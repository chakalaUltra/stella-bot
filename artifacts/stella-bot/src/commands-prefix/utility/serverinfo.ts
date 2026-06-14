import { ChannelType } from "discord.js";
import { infoReply } from "../../utils/ui.js";
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

    return message.reply(infoReply({
      title: guild.name,
      subtitle: `Server ID \`${guild.id}\``,
      thumbnail: guild.iconURL({ size: 256 }),
      rows: [
        ["Owner", `<@${guild.ownerId}>`],
        ["Created", `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`],
        ["Members", `${guild.memberCount} total · ${guild.memberCount - bots} humans · ${bots} bots`],
        ["Channels", `${text} text · ${voice} voice`],
        ["Roles", `${guild.roles.cache.size - 1}`],
        ["Boosts", `${guild.premiumSubscriptionCount ?? 0} (Tier ${guild.premiumTier})`],
      ],
    }));
  },
} satisfies PrefixCommand;
