import { PermissionFlagsBits, TextChannel } from "discord.js";
import { okReply, errReply } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "unlock",
  aliases: ["ul"],
  description: "Unlock the current channel",
  usage: "s!unlock",
  category: "Moderation",
  async execute(message, _args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ ...errReply("You need **Manage Channels** permission.") });
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ ...errReply("I need **Manage Channels** permission.") });
    }

    const channel = message.channel as TextChannel;

    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: null,
    }, { reason: `Unlocked by ${message.author.tag}` });

    return message.reply(okReply("Channel Unlocked", `<#${channel.id}> is now open.`));
  },
} satisfies PrefixCommand;
