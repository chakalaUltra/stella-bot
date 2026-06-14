import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS } from "../../config.js";

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin — heads or tails?"),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const emoji = result === "Heads" ? "🪙" : "💿";

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `${emoji} Coin Flip`,
          description: `The coin landed on... **${result}**!`,
          color: result === "Heads" ? COLORS.SUCCESS : COLORS.INFO,
        }),
      ],
    });
  },
};
