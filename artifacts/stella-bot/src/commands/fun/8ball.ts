import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, CLR } from "../../utils/ui.js";

const RESPONSES = [
  { text: "It is certain.", type: "positive" },
  { text: "It is decidedly so.", type: "positive" },
  { text: "Without a doubt.", type: "positive" },
  { text: "Yes, definitely.", type: "positive" },
  { text: "You may rely on it.", type: "positive" },
  { text: "As I see it, yes.", type: "positive" },
  { text: "Most likely.", type: "positive" },
  { text: "Outlook good.", type: "positive" },
  { text: "Yes.", type: "positive" },
  { text: "Signs point to yes.", type: "positive" },
  { text: "Reply hazy, try again.", type: "neutral" },
  { text: "Ask again later.", type: "neutral" },
  { text: "Better not tell you now.", type: "neutral" },
  { text: "Cannot predict now.", type: "neutral" },
  { text: "Concentrate and ask again.", type: "neutral" },
  { text: "Don't count on it.", type: "negative" },
  { text: "My reply is no.", type: "negative" },
  { text: "My sources say no.", type: "negative" },
  { text: "Outlook not so good.", type: "negative" },
  { text: "Very doubtful.", type: "negative" },
] as const;

const typeColor = { positive: CLR.SUCCESS, neutral: CLR.WARNING, negative: CLR.ERROR } as const;

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question")
    .addStringOption(o => o.setName("question").setDescription("Your question").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const question = interaction.options.getString("question", true);
    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]!;

    return interaction.reply(cardReply(
      `## 8-Ball\n**Q:** ${question}\n**A:** ${response.text}`,
      typeColor[response.type]
    ));
  },
};
