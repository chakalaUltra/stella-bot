import { cardReply, CLR } from "../../utils/ui.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "ping",
  aliases: ["latency"],
  description: "Check bot latency",
  usage: "s!ping",
  category: "Utility",
  cooldown: 5,
  async execute(message, _args, client) {
    const sent = await message.reply(cardReply("Measuring…"));
    const roundtrip = sent.createdTimestamp - message.createdTimestamp;
    const ws = client.ws.ping;
    const bar = (ms: number) => ms < 100 ? "🟢" : ms < 250 ? "🟡" : "🔴";

    await sent.edit(cardReply(
      `## Pong!\n**Roundtrip** · ${bar(roundtrip)} \`${roundtrip}ms\`\n**WebSocket** · ${bar(ws)} \`${ws}ms\``,
      CLR.PRIMARY
    ));
  },
} satisfies PrefixCommand;
