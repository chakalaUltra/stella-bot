import { SlashCommandBuilder, type ChatInputCommandInteraction, ChannelType } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS } from "../../config.js";

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Display information about this server"),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const guild = interaction.guild!;
    await guild.fetch();

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const members = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = members - bots;
    const roles = guild.roles.cache.size - 1;
    const emojis = guild.emojis.cache.size;
    const boosts = guild.premiumSubscriptionCount ?? 0;
    const boostLevel = guild.premiumTier;

    const verificationMap: Record<number, string> = {
      0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Highest",
    };

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `${EMOJIS.CROWN} ${guild.name}`,
          color: COLORS.PRIMARY,
          thumbnail: guild.iconURL({ size: 256 }) ?? undefined,
          fields: [
            { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
            { name: "📅 Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: "🌍 Region", value: guild.preferredLocale, inline: true },
            { name: "👥 Members", value: `**${members}** total\n👤 ${humans} humans\n🤖 ${bots} bots`, inline: true },
            { name: "📺 Channels", value: `💬 ${textChannels} text\n🔊 ${voiceChannels} voice\n📁 ${categoryChannels} categories`, inline: true },
            { name: "🎭 Roles", value: `${roles}`, inline: true },
            { name: "😄 Emojis", value: `${emojis}`, inline: true },
            { name: "🔒 Verification", value: verificationMap[guild.verificationLevel] ?? "Unknown", inline: true },
            { name: "🚀 Boosts", value: `${boosts} boosts (Level ${boostLevel})`, inline: true },
            { name: "🆔 Server ID", value: `\`${guild.id}\``, inline: false },
          ],
          image: guild.bannerURL({ size: 1024 }) ?? undefined,
        }),
      ],
    });
  },
};
