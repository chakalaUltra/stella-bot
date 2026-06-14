import {
  SlashCommandBuilder, type ChatInputCommandInteraction,
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { box, sect, CLR, type V2Reply } from "../../utils/ui.js";
import { MessageFlags } from "discord.js";

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

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("PNG").setStyle(ButtonStyle.Link).setURL(avatarUrl),
      new ButtonBuilder().setLabel("GIF").setStyle(ButtonStyle.Link).setURL(gifUrl),
    );

    const container = box(CLR.PRIMARY, [sect(`## ${user.username}'s Avatar`, avatarUrl)]);

    return interaction.reply({
      components: [container, row],
      flags: MessageFlags.IsComponentsV2,
    } as V2Reply);
  },
};
