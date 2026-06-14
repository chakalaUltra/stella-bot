import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, errReply, CLR } from "../../utils/ui.js";

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Let Stella choose between your options")
    .addStringOption(o =>
      o.setName("options").setDescription("Comma-separated options e.g. pizza, tacos, sushi").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const input = interaction.options.getString("options", true);
    const choices = input.split(",").map(s => s.trim()).filter(Boolean);

    if (choices.length < 2) {
      return interaction.reply({ ...errReply("Provide at least **2 options** separated by commas."), ephemeral: true });
    }

    const chosen = choices[Math.floor(Math.random() * choices.length)]!;
    const list = choices.map((c, i) => `${i + 1}. ${c}`).join("\n");

    return interaction.reply(cardReply(
      `## Choice\n**Options:**\n${list}\n\n**Answer:** ${chosen}`,
      CLR.INFO
    ));
  },
};
