import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply } from "../../utils/ui.js";
import { activeGames, buildGameMessage, START_BALANCE } from "../../games/slots.js";

export default {
  category: "Fun",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play Stella Slots! Start with 10 ⭐ SC and try your luck."),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (activeGames.has(interaction.user.id)) {
      return interaction.reply({
        ...errReply("You already have an active slots game! Finish it first."),
        ephemeral: true,
      });
    }

    const game = {
      userId: interaction.user.id,
      balance: START_BALANCE,
      bet: 1,
      ended: false,
    };

    activeGames.set(interaction.user.id, game);

    return interaction.reply(buildGameMessage(game, null, null));
  },
};
