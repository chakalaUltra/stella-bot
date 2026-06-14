import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS } from "../../config.js";

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice")
    .addIntegerOption(o =>
      o.setName("sides").setDescription("Number of sides (default: 6)").setMinValue(2).setMaxValue(1000).setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName("count").setDescription("Number of dice to roll (default: 1)").setMinValue(1).setMaxValue(10).setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const sides = interaction.options.getInteger("sides") ?? 6;
    const count = interaction.options.getInteger("count") ?? 1;

    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `🎲 Dice Roll — d${sides}`,
          color: COLORS.PRIMARY,
          fields: [
            { name: "🎯 Rolls", value: rolls.map((r, i) => `Die ${i + 1}: **${r}**`).join("\n"), inline: true },
            ...(count > 1 ? [{ name: "📊 Total", value: `**${total}**`, inline: true }] : []),
          ],
        }),
      ],
    });
  },
};
