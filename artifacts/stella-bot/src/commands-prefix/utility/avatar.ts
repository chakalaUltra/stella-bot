import { ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from "discord.js";
import { box, sect, CLR, type V2Reply } from "../../utils/ui.js";
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
      new ButtonBuilder().setLabel("PNG").setStyle(ButtonStyle.Link).setURL(avatarUrl),
      new ButtonBuilder().setLabel("GIF").setStyle(ButtonStyle.Link).setURL(gifUrl),
    );

    return message.reply({
      components: [box(CLR.PRIMARY, [sect(`## ${user.username}'s Avatar`, avatarUrl)]), row],
      flags: MessageFlags.IsComponentsV2,
    } as V2Reply);
  },
} satisfies PrefixCommand;
