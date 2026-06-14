import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS, BOT_NAME, BOT_VERSION } from "../../config.js";

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Display information about Stella"),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    const mem = process.memoryUsage();
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const commands = client.commands.size;

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `${EMOJIS.STAR} ${BOT_NAME} — Bot Information`,
          color: COLORS.PRIMARY,
          thumbnail: client.user?.displayAvatarURL({ size: 256 }),
          fields: [
            { name: "🤖 Version", value: `v${BOT_VERSION}`, inline: true },
            { name: "📡 Ping", value: `${client.ws.ping}ms`, inline: true },
            { name: "⏱️ Uptime", value: formatUptime(client.uptime ?? 0), inline: true },
            { name: "🏠 Guilds", value: `${guilds}`, inline: true },
            { name: "👥 Users", value: `${users.toLocaleString()}`, inline: true },
            { name: "📋 Commands", value: `${commands}`, inline: true },
            { name: "💾 Memory", value: formatBytes(mem.heapUsed), inline: true },
            { name: "⚙️ Node.js", value: process.version, inline: true },
            { name: "📦 discord.js", value: "v14", inline: true },
          ],
        }),
      ],
    });
  },
};
