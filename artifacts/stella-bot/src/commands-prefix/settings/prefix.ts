import { PermissionFlagsBits } from "discord.js";
import { okReply, errReply, cardReply, CLR } from "../../utils/ui.js";
import { guildDb } from "../../database/db.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "prefix",
  aliases: ["setprefix"],
  description: "Change the bot prefix for this server",
  usage: "s!prefix <new_prefix>",
  category: "Settings",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ ...errReply("You need **Manage Server** permission.") });
    }

    const newPrefix = args[0];
    if (!newPrefix) {
      const current = guildDb.get(message.guild!.id).prefix;
      return message.reply(cardReply(`## Current Prefix\n\`${current}\``, CLR.PRIMARY));
    }

    if (newPrefix.length > 5) {
      return message.reply({ ...errReply("Prefix must be 5 characters or less.") });
    }

    guildDb.update(message.guild!.id, { prefix: newPrefix });
    return message.reply(okReply("Prefix Updated", `New prefix: \`${newPrefix}\`\nExample: \`${newPrefix}help\``));
  },
} satisfies PrefixCommand;
