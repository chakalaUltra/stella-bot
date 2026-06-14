import { PermissionFlagsBits, GuildMember } from "discord.js";
import { modEmbed, errorEmbed } from "../../utils/embed.js";
import { EMOJIS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "kick",
  aliases: ["k"],
  description: "Kick a member from the server",
  usage: "s!kick @user [reason]",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply({ embeds: [errorEmbed("You need **Kick Members** permission.")] });
    }

    const target = message.mentions.members?.first() as GuildMember | undefined;
    if (!target) return message.reply({ embeds: [errorEmbed("Please mention a member to kick.")] });
    if (!target.kickable) return message.reply({ embeds: [errorEmbed("I cannot kick this user.")] });

    const reason = args.slice(1).join(" ") || "No reason provided";

    await target.send({
      embeds: [errorEmbed(`You have been **kicked** from **${message.guild!.name}**.\n**Reason:** ${reason}`)],
    }).catch(() => null);

    await target.kick(`${reason} | Moderator: ${message.author.tag}`);

    return message.reply({
      embeds: [modEmbed({
        action: "Member Kicked",
        emoji: EMOJIS.KICK,
        target: `${target.user.tag} (${target.id})`,
        moderator: `<@${message.author.id}>`,
        reason,
      })],
    });
  },
} satisfies PrefixCommand;
