import { PermissionFlagsBits, GuildMember } from "discord.js";
import { modReply, errReply, CLR } from "../../utils/ui.js";
import { parseDuration, formatDuration } from "../../utils/permissions.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "timeout",
  aliases: ["mute", "to"],
  description: "Timeout (mute) a member",
  usage: "s!timeout @user <duration> [reason]",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ ...errReply("You need **Moderate Members** permission.") });
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ ...errReply("I need **Moderate Members** permission.") });
    }

    const target = message.mentions.members?.first() as GuildMember | undefined;
    if (!target) return message.reply({ ...errReply("Please mention a member to timeout.") });
    if (target.user.bot) return message.reply({ ...errReply("You cannot timeout a bot.") });
    if (!target.moderatable) return message.reply({ ...errReply("I cannot timeout this user.") });

    const durationStr = args[1];
    if (!durationStr) return message.reply({ ...errReply("Please provide a duration. e.g. `10m`, `1h`, `1d`") });

    const duration = parseDuration(durationStr);
    if (!duration) return message.reply({ ...errReply("Invalid duration. Use: `10s`, `5m`, `2h`, `1d`") });
    if (duration > 28 * 24 * 60 * 60 * 1000) return message.reply({ ...errReply("Maximum timeout duration is 28 days.") });

    const reason = args.slice(2).join(" ") || "No reason provided";

    await target.timeout(duration, `${reason} | Moderator: ${message.author.tag}`);

    return message.reply(modReply({
      action: "Timed Out",
      targetTag: target.user.tag,
      targetId: target.id,
      targetAvatar: target.user.displayAvatarURL({ size: 128 }),
      moderatorId: message.author.id,
      reason,
      extra: [["Duration", formatDuration(duration)]],
      color: CLR.WARNING,
    }));
  },
} satisfies PrefixCommand;
