import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { infoReply } from "../../utils/ui.js";
import { BOT_NAME, BOT_VERSION } from "../../config.js";

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription(`Display information about ${BOT_NAME}`),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    const mem = process.memoryUsage();
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    return interaction.reply(infoReply({
      title: BOT_NAME,
      subtitle: `Version ${BOT_VERSION}`,
      thumbnail: client.user?.displayAvatarURL({ size: 256 }),
      rows: [
        ["Ping", `${client.ws.ping}ms`],
        ["Uptime", formatUptime(client.uptime ?? 0)],
        ["Guilds", `${guilds}`],
        ["Users", users.toLocaleString()],
        ["Commands", `${client.commands.size}`],
        ["Memory", formatBytes(mem.heapUsed)],
        ["Node.js", process.version],
        ["discord.js", "v14"],
      ],
    }));
  },
};
