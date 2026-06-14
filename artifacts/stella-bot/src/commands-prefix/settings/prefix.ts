import { PermissionFlagsBits } from "discord.js";
import { successEmbed, errorEmbed } from "../../utils/embed.js";
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
      return message.reply({ embeds: [errorEmbed("You need **Manage Server** permission.")] });
    }

    const newPrefix = args[0];
    if (!newPrefix) {
      const current = guildDb.get(message.guild!.id).prefix;
      return message.reply({ embeds: [successEmbed("Current Prefix", `The current prefix is \`${current}\``)] });
    }

    if (newPrefix.length > 5) {
      return message.reply({ embeds: [errorEmbed("Prefix must be 5 characters or less.")] });
    }

    guildDb.update(message.guild!.id, { prefix: newPrefix });
    return message.reply({ embeds: [successEmbed("Prefix Updated", `Prefix changed to \`${newPrefix}\`\nExample: \`${newPrefix}help\``)] });
  },
} satisfies PrefixCommand;
