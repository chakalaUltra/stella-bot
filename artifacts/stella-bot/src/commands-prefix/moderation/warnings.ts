import { PermissionFlagsBits } from "discord.js";
import { okReply, errReply, infoReply, CLR } from "../../utils/ui.js";
import { warningDb } from "../../database/db.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "warnings",
  aliases: ["warns", "infractions"],
  description: "Manage warnings for a member",
  usage: "s!warnings <list|clear|remove> @user/id",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ ...errReply("You need **Moderate Members** permission.") });
    }

    const sub = args[0]?.toLowerCase();

    if (!sub || !["list", "clear", "remove"].includes(sub)) {
      return message.reply({ ...errReply("Usage: `s!warnings <list|clear|remove> @user` or `s!warnings remove <id>`") });
    }

    if (sub === "list") {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ ...errReply("Please mention a user to list warnings for.") });

      const warns = warningDb.getAll(message.guild!.id, target.id);

      if (warns.length === 0) {
        return message.reply(okReply("No Warnings", `**${target.username}** has no warnings on record.`));
      }

      return message.reply(infoReply({
        title: `${target.username} — Warnings`,
        subtitle: `${warns.length} warning(s) total`,
        thumbnail: target.displayAvatarURL({ size: 128 }),
        rows: warns.slice(0, 10).map((w, i) => [
          `#${i + 1} (ID ${w.id})`,
          `${w.reason} · <@${w.moderator_id}> · <t:${w.created_at}:R>`,
        ]),
        color: CLR.WARNING,
      }));
    }

    if (sub === "clear") {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ ...errReply("Please mention a user to clear warnings for.") });

      const count = warningDb.clear(message.guild!.id, target.id);
      return message.reply(okReply("Warnings Cleared", `Removed **${count}** warning(s) from **${target.tag}**.`));
    }

    if (sub === "remove") {
      const id = parseInt(args[1] ?? "", 10);
      if (isNaN(id)) return message.reply({ ...errReply("Please provide a valid warning ID. e.g. `s!warnings remove 5`") });

      warningDb.remove(id);
      return message.reply(okReply("Warning Removed", `Warning **#${id}** has been deleted.`));
    }
  },
} satisfies PrefixCommand;
