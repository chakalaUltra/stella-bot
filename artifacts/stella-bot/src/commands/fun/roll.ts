import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, CLR } from "../../utils/ui.js";

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice")
    .addIntegerOption(o => o.setName("sides").setDescription("Number of sides (default 6)").setMinValue(2).setMaxValue(1000).setRequired(false))
    .addIntegerOption(o => o.setName("count").setDescription("Number of dice (default 1, max 10)").setMinValue(1).setMaxValue(10).setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const sides = interaction.options.getInteger("sides") ?? 6;
    const count = interaction.options.getInteger("count") ?? 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    const rollLine = count === 1
      ? `Result: **${rolls[0]}**`
      : `Rolls: ${rolls.map((r, i) => `Die ${i + 1} → **${r}**`).join(" · ")}\nTotal: **${total}**`;

    return interaction.reply(cardReply(`## Dice Roll · d${sides}\n${rollLine}`, CLR.PRIMARY));
  },
};
