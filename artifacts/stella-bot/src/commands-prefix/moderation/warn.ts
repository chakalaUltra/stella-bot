import { PermissionFlagsBits } from "discord.js";
import { modEmbed, errorEmbed } from "../../utils/embed.js";
import { warningDb } from "../../database/db.js";
import { EMOJIS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "warn",
  aliases: ["w"],
  description: "Warn a member",
  usage: "s!warn @user <reason>",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [errorEmbed("You need **Moderate Members** permission.")] });
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply({ embeds: [errorEmbed("Please mention a user to warn.")] });
    if (target.bot) return message.reply({ embeds: [errorEmbed("You cannot warn a bot.")] });

    const reason = args.slice(1).join(" ");
    if (!reason) return message.reply({ embeds: [errorEmbed("Please provide a reason for the warning.")] });

    warningDb.add(message.guild!.id, target.id, message.author.id, reason);
    const total = warningDb.count(message.guild!.id, target.id);

    await target.send({
      embeds: [errorEmbed(`You received a warning in **${message.guild!.name}**.\n**Reason:** ${reason}\n**Total Warnings:** ${total}`)],
    }).catch(() => null);

    return message.reply({
      embeds: [modEmbed({
        action: "Member Warned",
        emoji: EMOJIS.WARN,
        target: `${target.tag} (${target.id})`,
        moderator: `<@${message.author.id}>`,
        reason,
        extra: [{ name: "📊 Total Warnings", value: `${total}` }],
      })],
    });
  },
} satisfies PrefixCommand;
