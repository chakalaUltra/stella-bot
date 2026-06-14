import { EmbedBuilder } from "discord.js";
import { COLORS, BOT_FOOTER, EMOJIS } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "ping",
  aliases: ["latency"],
  description: "Check bot latency",
  usage: "s!ping",
  category: "Utility",
  cooldown: 5,
  async execute(message, _args, client) {
    const sent = await message.reply("Pinging...");
    const roundtrip = sent.createdTimestamp - message.createdTimestamp;
    const ws = client.ws.ping;

    const ind = (ms: number) => ms < 100 ? "🟢" : ms < 250 ? "🟡" : "🔴";

    await sent.edit({
      content: null,
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle(`${EMOJIS.PING} Pong!`)
          .addFields(
            { name: `${ind(roundtrip)} Roundtrip`, value: `\`${roundtrip}ms\``, inline: true },
            { name: `${ind(ws)} WebSocket`, value: `\`${ws}ms\``, inline: true },
          )
          .setFooter({ text: BOT_FOOTER })
          .setTimestamp(),
      ],
    });
  },
} satisfies PrefixCommand;
