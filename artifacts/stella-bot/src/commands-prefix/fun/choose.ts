import { createEmbed, errorEmbed } from "../../utils/embed.js";
import { COLORS } from "../../config.js";
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
    if (choices.length < 2) return message.reply({ embeds: [errorEmbed("Provide at least **2 options** separated by commas.")] });

    const chosen = choices[Math.floor(Math.random() * choices.length)]!;
    return message.reply({
      embeds: [createEmbed({
        title: "✨ Stella's Choice",
        color: COLORS.INFO,
        fields: [
          { name: "📋 Options", value: choices.map((c, i) => `${i + 1}. ${c}`).join("\n"), inline: true },
          { name: "🎯 Chosen", value: `**${chosen}**`, inline: true },
        ],
      })],
    });
  },
} satisfies PrefixCommand;
