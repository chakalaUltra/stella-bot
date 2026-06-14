import { createEmbed } from "../../utils/embed.js";
import { COLORS } from "../../config.js";
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

    return message.reply({
      embeds: [createEmbed({
        title: `🎲 Dice Roll — d${sides}`,
        color: COLORS.PRIMARY,
        fields: [
          { name: "🎯 Rolls", value: rolls.map((r, i) => `Die ${i + 1}: **${r}**`).join("\n"), inline: true },
          ...(count > 1 ? [{ name: "📊 Total", value: `**${total}**`, inline: true }] : []),
        ],
      })],
    });
  },
} satisfies PrefixCommand;
