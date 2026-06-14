import { PermissionFlagsBits } from "discord.js";
import { modReply, errReply, CLR } from "../../utils/ui.js";
import { warningDb } from "../../database/db.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "warn",
  aliases: ["w"],
  description: "Warn a member",
  usage: "s!warn @user <reason>",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ ...errReply("You need **Moderate Members** permission.") });
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply({ ...errReply("Please mention a user to warn.") });
    if (target.bot) return message.reply({ ...errReply("You cannot warn a bot.") });

    const reason = args.slice(1).join(" ");
    if (!reason) return message.reply({ ...errReply("Please provide a reason for the warning.") });

    warningDb.add(message.guild!.id, target.id, message.author.id, reason);
    const total = warningDb.count(message.guild!.id, target.id);

    await target.send({ ...errReply(`You received a warning in **${message.guild!.name}**.\n**Reason:** ${reason}`) }).catch(() => null);

    return message.reply(modReply({
      action: "Warned",
      targetTag: target.tag,
      targetId: target.id,
      targetAvatar: target.displayAvatarURL({ size: 128 }),
      moderatorId: message.author.id,
      reason,
      extra: [["Total warnings", `${total}`]],
      color: CLR.WARNING,
    }));
  },
} satisfies PrefixCommand;
