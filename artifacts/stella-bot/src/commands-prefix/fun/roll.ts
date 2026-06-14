import { cardReply, CLR } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "roll",
  aliases: ["dice", "r"],
  description: "Roll a dice",
  usage: "s!roll [sides] [count]",
  category: "Fun",
  cooldown: 3,
  async execute(message, args) {
    const sides = Math.min(1000, Math.max(2, parseInt(args[0] ?? "6") || 6));
    const count = Math.min(10, Math.max(1, parseInt(args[1] ?? "1") || 1));
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    const rollLine = count === 1
      ? `Result: **${rolls[0]}**`
      : `Rolls: ${rolls.map((r, i) => `Die ${i + 1} → **${r}**`).join(" · ")}\nTotal: **${total}**`;

    return message.reply(cardReply(`## Dice Roll · d${sides}\n${rollLine}`, CLR.PRIMARY));
  },
} satisfies PrefixCommand;
