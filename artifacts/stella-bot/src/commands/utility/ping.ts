import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS } from "../../config.js";

export default {
  category: "Utility",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency"),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = client.ws.ping;

    const getIndicator = (ms: number) => {
      if (ms < 100) return "🟢";
      if (ms < 250) return "🟡";
      return "🔴";
    };

    await interaction.editReply({
      content: null,
      embeds: [
        createEmbed({
          title: `${EMOJIS.PING} Pong!`,
          color: COLORS.PRIMARY,
          fields: [
            { name: `${getIndicator(roundtrip)} Roundtrip`, value: `\`${roundtrip}ms\``, inline: true },
            { name: `${getIndicator(ws)} WebSocket`, value: `\`${ws}ms\``, inline: true },
          ],
        }),
      ],
    });
  },
};
