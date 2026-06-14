import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS } from "../../config.js";

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Show the server member count breakdown"),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const guild = interaction.guild!;
    await guild.members.fetch();

    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;
    const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
    const idle = guild.members.cache.filter(m => m.presence?.status === "idle").size;
    const dnd = guild.members.cache.filter(m => m.presence?.status === "dnd").size;

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `${EMOJIS.CROWN} ${guild.name} — Member Count`,
          color: COLORS.PRIMARY,
          thumbnail: guild.iconURL({ size: 256 }) ?? undefined,
          fields: [
            { name: "👥 Total Members", value: `**${total.toLocaleString()}**`, inline: false },
            { name: "👤 Humans", value: `${humans.toLocaleString()}`, inline: true },
            { name: "🤖 Bots", value: `${bots.toLocaleString()}`, inline: true },
            { name: "\u200b", value: "\u200b", inline: true },
            { name: "🟢 Online", value: `${online}`, inline: true },
            { name: "🟡 Idle", value: `${idle}`, inline: true },
            { name: "🔴 DND", value: `${dnd}`, inline: true },
          ],
        }),
      ],
    });
  },
};
