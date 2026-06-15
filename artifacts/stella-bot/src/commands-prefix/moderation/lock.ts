import { PermissionFlagsBits, TextChannel } from "discord.js";
import { okReply, errReply } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "lock",
  aliases: ["lockdown"],
  description: "Lock the current channel",
  usage: "s!lock [reason]",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ ...errReply("You need **Manage Channels** permission.") });
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ ...errReply("I need **Manage Channels** permission.") });
    }

    const channel = message.channel as TextChannel;
    const reason = args.join(" ") || "No reason provided";

    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: false,
    }, { reason: `${reason} | Moderator: ${message.author.tag}` });

    return message.reply(okReply("Channel Locked", `<#${channel.id}> is now locked.\n**Reason:** ${reason}`));
  },
} satisfies PrefixCommand;
