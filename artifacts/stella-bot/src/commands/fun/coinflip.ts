import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, CLR } from "../../utils/ui.js";

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin — heads or tails?"),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";

    return interaction.reply(cardReply(
      `## Coin Flip\nThe coin landed on **${result}**.`,
      result === "Heads" ? CLR.SUCCESS : CLR.INFO
    ));
  },
};
