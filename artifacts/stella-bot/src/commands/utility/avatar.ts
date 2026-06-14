import { SlashCommandBuilder, type ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS } from "../../config.js";

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get a user's avatar")
    .addUserOption(o => o.setName("user").setDescription("The user (defaults to you)").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const user = interaction.options.getUser("user") ?? interaction.user;

    const avatarUrl = user.displayAvatarURL({ size: 1024, extension: "png" });
    const gifUrl = user.displayAvatarURL({ size: 1024, extension: "gif" });

    const pngBtn = new ButtonBuilder()
      .setLabel("PNG")
      .setStyle(ButtonStyle.Link)
      .setURL(avatarUrl)
      .setEmoji("🖼️");

    const gifBtn = new ButtonBuilder()
      .setLabel("GIF")
      .setStyle(ButtonStyle.Link)
      .setURL(gifUrl)
      .setEmoji("🎞️");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(pngBtn, gifBtn);

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `${EMOJIS.SPARKLE} ${user.username}'s Avatar`,
          color: COLORS.PRIMARY,
          image: avatarUrl,
        }),
      ],
      components: [row],
    });
  },
};
