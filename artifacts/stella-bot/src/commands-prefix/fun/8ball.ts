import { cardReply, errReply, CLR } from "../../utils/ui.js";
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
] as const;

const typeColor = { positive: CLR.SUCCESS, neutral: CLR.WARNING, negative: CLR.ERROR } as const;

export default {
  name: "8ball",
  aliases: ["eightball", "ask"],
  description: "Ask the magic 8-ball",
  usage: "s!8ball <question>",
  category: "Fun",
  cooldown: 3,
  async execute(message, args) {
    const question = args.join(" ");
    if (!question) return message.reply({ ...errReply("Please ask a question!") });

    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]!;

    return message.reply(cardReply(
      `## 8-Ball\n**Q:** ${question}\n**A:** ${response.text}`,
      typeColor[response.type]
    ));
  },
} satisfies PrefixCommand;
