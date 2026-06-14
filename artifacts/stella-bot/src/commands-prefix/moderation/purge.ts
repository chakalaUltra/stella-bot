import { PermissionFlagsBits, TextChannel } from "discord.js";
import { okReply, errReply } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "purge",
  aliases: ["clear", "prune"],
  description: "Delete multiple messages",
  usage: "s!purge <amount> [@user]",
  category: "Moderation",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ ...errReply("You need **Manage Messages** permission.") });
    }

    const amount = parseInt(args[0] ?? "");
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply({ ...errReply("Please provide a number between 1 and 100.") });
    }

    const targetUser = message.mentions.users.first();
    const channel = message.channel as TextChannel;
    await message.delete().catch(() => null);

    const fetched = await channel.messages.fetch({ limit: 100 });
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    let toDelete = [...fetched.values()].filter(m => m.createdTimestamp > twoWeeksAgo);
    if (targetUser) toDelete = toDelete.filter(m => m.author.id === targetUser.id);
    toDelete = toDelete.slice(0, amount);

    if (toDelete.length === 0) return channel.send({ ...errReply("No messages to delete.") });

    const deleted = await channel.bulkDelete(toDelete, true);
    const reply = await channel.send(okReply("Purged", `Deleted **${deleted.size}** message(s)${targetUser ? ` from **${targetUser.tag}**` : ""}.`));

    setTimeout(() => reply.delete().catch(() => null), 5000);
  },
} satisfies PrefixCommand;
