import { cardReply, CLR } from "../../utils/ui.js";
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
    return message.reply(cardReply(
      `## Coin Flip\nThe coin landed on **${result}**.`,
      result === "Heads" ? CLR.SUCCESS : CLR.INFO
    ));
  },
} satisfies PrefixCommand;
