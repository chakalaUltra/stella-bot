import { createEmbed, errorEmbed } from "../../utils/embed.js";
import { COLORS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

const RESPONSES = [
  { text: "It is certain.", type: "positive" },
  { text: "Without a doubt.", type: "positive" },
  { text: "Yes, definitely.", type: "positive" },
  { text: "Most likely.", type: "positive" },
  { text: "Signs point to yes.", type: "positive" },
  { text: "Ask again later.", type: "neutral" },
  { text: "Cannot predict now.", type: "neutral" },
  { text: "Better not tell you now.", type: "neutral" },
  { text: "Don't count on it.", type: "negative" },
  { text: "My reply is no.", type: "negative" },
  { text: "Very doubtful.", type: "negative" },
];

export default {
  name: "8ball",
  aliases: ["eightball", "ask"],
  description: "Ask the magic 8-ball",
  usage: "s!8ball <question>",
  category: "Fun",
  cooldown: 3,
  async execute(message, args) {
    const question = args.join(" ");
    if (!question) return message.reply({ embeds: [errorEmbed("Please ask a question!")] });

    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]!;
    const colorMap = { positive: COLORS.SUCCESS, neutral: COLORS.WARNING, negative: COLORS.ERROR } as const;
    const emojiMap = { positive: "🟢", neutral: "🟡", negative: "🔴" } as const;

    return message.reply({
      embeds: [createEmbed({
        title: "🎱 Magic 8-Ball",
        color: colorMap[response.type as keyof typeof colorMap],
        fields: [
          { name: "❓ Question", value: question },
          { name: `${emojiMap[response.type as keyof typeof emojiMap]} Answer`, value: `**${response.text}**` },
        ],
      })],
    });
  },
} satisfies PrefixCommand;
