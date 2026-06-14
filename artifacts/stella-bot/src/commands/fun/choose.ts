import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed, errorEmbed } from "../../utils/embed.js";
import { COLORS } from "../../config.js";

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Let Stella choose between your options")
    .addStringOption(o =>
      o.setName("options").setDescription("Comma-separated options (e.g. pizza, tacos, sushi)").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const input = interaction.options.getString("options", true);
    const choices = input.split(",").map(s => s.trim()).filter(Boolean);

    if (choices.length < 2) {
      return interaction.reply({
        embeds: [errorEmbed("Please provide at least **2 options** separated by commas.")],
        ephemeral: true,
      });
    }

    const chosen = choices[Math.floor(Math.random() * choices.length)]!;

    return interaction.reply({
      embeds: [
        createEmbed({
          title: "✨ Stella's Choice",
          color: COLORS.INFO,
          fields: [
            { name: "📋 Options", value: choices.map((c, i) => `${i + 1}. ${c}`).join("\n"), inline: true },
            { name: "🎯 Chosen", value: `**${chosen}**`, inline: true },
          ],
        }),
      ],
    });
  },
};
