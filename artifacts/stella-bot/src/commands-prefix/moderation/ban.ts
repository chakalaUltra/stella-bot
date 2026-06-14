import { PermissionFlagsBits } from "discord.js";
import { modReply, errReply } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "ban",
  aliases: ["b"],
  description: "Ban a member from the server",
  usage: "s!ban @user [reason]",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ ...errReply("You need **Ban Members** permission.") });
    }
    if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ ...errReply("I need **Ban Members** permission.") });
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply({ ...errReply("Please mention a user to ban.") });

    const reason = args.slice(1).join(" ") || "No reason provided";
    const member = message.guild.members.cache.get(target.id);
    if (member && !member.bannable) return message.reply({ ...errReply("I cannot ban this user.") });

    await target.send({ ...errReply(`You were **banned** from **${message.guild.name}**.\n**Reason:** ${reason}`) }).catch(() => null);
    await message.guild.bans.create(target.id, { reason: `${reason} | Moderator: ${message.author.tag}` });

    return message.reply(modReply({
      action: "Banned",
      targetTag: target.tag,
      targetId: target.id,
      targetAvatar: target.displayAvatarURL({ size: 128 }),
      moderatorId: message.author.id,
      reason,
    }));
  },
} satisfies PrefixCommand;
