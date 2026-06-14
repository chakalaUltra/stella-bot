import { cardReply, errReply, CLR } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "choose",
  aliases: ["pick", "decide"],
  description: "Let Stella choose between options",
  usage: "s!choose option1, option2, option3",
  category: "Fun",
  cooldown: 3,
  async execute(message, args) {
    const input = args.join(" ");
    const choices = input.split(",").map(s => s.trim()).filter(Boolean);
    if (choices.length < 2) return message.reply({ ...errReply("Provide at least **2 options** separated by commas.") });

    const chosen = choices[Math.floor(Math.random() * choices.length)]!;
    const list = choices.map((c, i) => `${i + 1}. ${c}`).join("\n");

    return message.reply(cardReply(
      `## Choice\n**Options:**\n${list}\n\n**Answer:** ${chosen}`,
      CLR.INFO
    ));
  },
} satisfies PrefixCommand;
