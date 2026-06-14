import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "avatar",
  aliases: ["av", "pfp"],
  description: "Get a user's avatar",
  usage: "s!avatar [@user]",
  category: "Utility",
  async execute(message, _args) {
    const user = message.mentions.users.first() ?? message.author;
    const avatarUrl = user.displayAvatarURL({ size: 1024, extension: "png" });
    const gifUrl = user.displayAvatarURL({ size: 1024, extension: "gif" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("PNG").setStyle(ButtonStyle.Link).setURL(avatarUrl).setEmoji("🖼️"),
      new ButtonBuilder().setLabel("GIF").setStyle(ButtonStyle.Link).setURL(gifUrl).setEmoji("🎞️"),
    );

    return message.reply({
      embeds: [createEmbed({ title: `${EMOJIS.SPARKLE} ${user.username}'s Avatar`, color: COLORS.PRIMARY, image: avatarUrl })],
      components: [row],
    });
  },
} satisfies PrefixCommand;
