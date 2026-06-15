import { PermissionFlagsBits, TextChannel } from "discord.js";
import { okReply, errReply } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "slowmode",
  aliases: ["slow", "sm"],
  description: "Set slowmode for the current channel",
  usage: "s!slowmode <seconds>",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ ...errReply("You need **Manage Channels** permission.") });
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ ...errReply("I need **Manage Channels** permission.") });
    }

    const seconds = parseInt(args[0] ?? "", 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({ ...errReply("Please provide a valid number of seconds (0–21600).") });
    }

    const channel = message.channel as TextChannel;
    await channel.setRateLimitPerUser(seconds, `Slowmode set by ${message.author.tag}`);

    if (seconds === 0) {
      return message.reply(okReply("Slowmode Disabled", `Slowmode removed from <#${channel.id}>.`));
    }

    return message.reply(okReply("Slowmode Set", `<#${channel.id}> now has a **${seconds}s** cooldown per message.`));
  },
} satisfies PrefixCommand;
