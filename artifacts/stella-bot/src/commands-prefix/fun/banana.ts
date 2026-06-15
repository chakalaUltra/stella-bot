import { cardReply, CLR } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

const COMMENTS: Record<string, string> = {
  tiny:   "That's... a baby banana. 🐣",
  small:  "Modest, but it's there!",
  medium: "Perfectly average. Nothing to write home about.",
  large:  "That's a solid banana. 🤝",
  huge:   "Okay that's impressive. 👀",
  mega:   "SCIENTIFICALLY IMPOSSIBLE. We don't believe you. 🤯",
};

function getComment(cm: number): string {
  if (cm <= 5) return COMMENTS.tiny!;
  if (cm <= 10) return COMMENTS.small!;
  if (cm <= 16) return COMMENTS.medium!;
  if (cm <= 22) return COMMENTS.large!;
  if (cm <= 28) return COMMENTS.huge!;
  return COMMENTS.mega!;
}

export default {
  name: "banana",
  aliases: ["banan"],
  description: "Find out how long a user's banana is (just a joke!)",
  usage: "s!banana [@user]",
  category: "Fun",
  async execute(message, _args) {
    const target = message.mentions.users.first() ?? message.author;
    const cm = Math.floor(Math.random() * 30) + 1;
    const bar = "🍌".repeat(Math.ceil(cm / 5));
    const comment = getComment(cm);

    return message.reply(
      cardReply(
        `## 🍌 Banana Meter\n**${target.displayName ?? target.username}'s** banana is **${cm} cm** long!\n${bar}\n-# ${comment}\n-# *(This is purely a joke — don't take it seriously!)*`,
        CLR.WARNING
      )
    );
  },
} satisfies PrefixCommand;
