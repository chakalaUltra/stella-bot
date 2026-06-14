import { PermissionFlagsBits, GuildMember } from "discord.js";
import { modReply, errReply } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "kick",
  aliases: ["k"],
  description: "Kick a member from the server",
  usage: "s!kick @user [reason]",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply({ ...errReply("You need **Kick Members** permission.") });
    }

    const target = message.mentions.members?.first() as GuildMember | undefined;
    if (!target) return message.reply({ ...errReply("Please mention a member to kick.") });
    if (!target.kickable) return message.reply({ ...errReply("I cannot kick this user.") });

    const reason = args.slice(1).join(" ") || "No reason provided";

    await target.send({ ...errReply(`You were **kicked** from **${message.guild!.name}**.\n**Reason:** ${reason}`) }).catch(() => null);
    await target.kick(`${reason} | Moderator: ${message.author.tag}`);

    return message.reply(modReply({
      action: "Kicked",
      targetTag: target.user.tag,
      targetId: target.id,
      targetAvatar: target.user.displayAvatarURL({ size: 128 }),
      moderatorId: message.author.id,
      reason,
    }));
  },
} satisfies PrefixCommand;
