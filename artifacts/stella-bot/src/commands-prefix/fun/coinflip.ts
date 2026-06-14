import { createEmbed } from "../../utils/embed.js";
import { COLORS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "coinflip",
  aliases: ["flip", "coin"],
  description: "Flip a coin",
  usage: "s!coinflip",
  category: "Fun",
  cooldown: 3,
  async execute(message) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    return message.reply({
      embeds: [createEmbed({
        title: `${result === "Heads" ? "🪙" : "💿"} Coin Flip`,
        description: `The coin landed on... **${result}**!`,
        color: result === "Heads" ? COLORS.SUCCESS : COLORS.INFO,
      })],
    });
  },
} satisfies PrefixCommand;
