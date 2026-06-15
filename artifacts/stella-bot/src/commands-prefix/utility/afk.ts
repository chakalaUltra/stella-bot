import { okReply, cardReply, CLR } from "../../utils/ui.js";
import { afkStore } from "../../state/afk.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "afk",
  aliases: ["away"],
  description: "Set your AFK status",
  usage: "s!afk [reason]",
  category: "Utility",
  async execute(message, args) {
    const reason = args.join(" ") || "AFK";

    if (afkStore.has(message.author.id)) {
      return message.reply({
        ...cardReply(`## Already AFK\nYou're already AFK. Send any message to remove your status.`, CLR.WARNING),
      });
    }

    afkStore.set(message.author.id, { reason, since: Date.now() });

    return message.reply(okReply("AFK Set", `You're now AFK: **${reason}**\nI'll let others know when they ping you.`));
  },
} satisfies PrefixCommand;
