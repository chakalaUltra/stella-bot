import { SlashCommandBuilder, type ChatInputCommandInteraction, ChannelType } from "discord.js";
import type { StellaClient } from "../../client.js";
import { infoReply } from "../../utils/ui.js";

const verificationLabels: Record<number, string> = {
  0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Highest",
};

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Display information about this server"),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const guild = interaction.guild!;
    await guild.fetch();

    const text = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voice = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;

    return interaction.reply(infoReply({
      title: guild.name,
      subtitle: `Server ID \`${guild.id}\``,
      thumbnail: guild.iconURL({ size: 256 }),
      rows: [
        ["Owner", `<@${guild.ownerId}>`],
        ["Created", `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`],
        ["Members", `${guild.memberCount} total · ${humans} humans · ${bots} bots`],
        ["Channels", `${text} text · ${voice} voice`],
        ["Roles", `${guild.roles.cache.size - 1}`],
        ["Emojis", `${guild.emojis.cache.size}`],
        ["Boosts", `${guild.premiumSubscriptionCount ?? 0} (Tier ${guild.premiumTier})`],
        ["Verification", verificationLabels[guild.verificationLevel] ?? "Unknown"],
        ["Locale", guild.preferredLocale],
      ],
    }));
  },
};
