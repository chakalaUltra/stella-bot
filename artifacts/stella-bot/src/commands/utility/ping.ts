import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, CLR } from "../../utils/ui.js";

export default {
  category: "Utility",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency"),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    await interaction.reply(cardReply("Measuring latency…"));

    const roundtrip = Date.now() - interaction.createdTimestamp;
    const ws = client.ws.ping;

    const bar = (ms: number) => ms < 100 ? "🟢" : ms < 250 ? "🟡" : "🔴";

    await interaction.editReply(cardReply(
      `## Pong!\n**Roundtrip** · ${bar(roundtrip)} \`${roundtrip}ms\`\n**WebSocket** · ${bar(ws)} \`${ws}ms\``,
      CLR.PRIMARY
    ));
  },
};
