import { PermissionFlagsBits, TextChannel } from "discord.js";
import { okReply, errReply } from "../../utils/ui.js";
import { stickyStore } from "../../state/sticky.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "stickymessage",
  aliases: ["sticky"],
  description: "Set or remove a sticky message in this channel",
  usage: "s!stickymessage set <message> | s!stickymessage remove",
  category: "Utility",
  async execute(message, args) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ ...errReply("You need **Manage Messages** permission.") });
    }

    const sub = args[0]?.toLowerCase();
    const channelId = message.channelId;

    if (!sub || !["set", "remove"].includes(sub)) {
      return message.reply({ ...errReply("Usage: `s!stickymessage set <message>` or `s!stickymessage remove`") });
    }

    if (sub === "set") {
      const content = args.slice(1).join(" ");
      if (!content) return message.reply({ ...errReply("Please provide a message to stick.") });

      const existing = stickyStore.get(channelId);
      if (existing?.messageId) {
        await (message.channel as TextChannel).messages.delete(existing.messageId).catch(() => null);
      }

      const sent = await (message.channel as TextChannel).send(`📌 **Sticky:** ${content}`);
      stickyStore.set(channelId, { content, messageId: sent.id });

      return message.reply({ ...okReply("Sticky Set", "A sticky message has been pinned to this channel.") });
    }

    if (sub === "remove") {
      const existing = stickyStore.get(channelId);
      if (!existing) return message.reply({ ...errReply("There is no sticky message in this channel.") });

      if (existing.messageId) {
        await (message.channel as TextChannel).messages.delete(existing.messageId).catch(() => null);
      }

      stickyStore.delete(channelId);
      return message.reply({ ...okReply("Sticky Removed", "The sticky message has been removed.") });
    }
  },
} satisfies PrefixCommand;
