import type { Guild, TextBasedChannel } from "discord.js";
import { CONTEXT_MESSAGE_LIMIT } from "./config.js";

export async function gatherServerContext(guild: Guild, channel: TextBasedChannel): Promise<string> {
  const lines: string[] = [];

  lines.push(`## Server: ${guild.name} (ID: ${guild.id})`);
  lines.push(`Member count: ${guild.memberCount}`);
  lines.push(`Created: ${guild.createdAt.toDateString()}`);
  lines.push(`Owner ID: ${guild.ownerId}`);

  try {
    const roles = guild.roles.cache
      .filter((r) => r.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .map((r) => `  - ${r.name} (ID: ${r.id}, color: #${r.color.toString(16).padStart(6, "0")})`)
      .slice(0, 30);
    lines.push(`\nRoles (${roles.length} shown):\n${roles.join("\n")}`);
  } catch {
    lines.push("\nRoles: unavailable");
  }

  try {
    const members = guild.members.cache
      .filter((m) => !m.user.bot)
      .map((m) => {
        const roles = m.roles.cache
          .filter((r) => r.name !== "@everyone")
          .map((r) => r.name)
          .join(", ");
        return `  - ${m.displayName} (ID: ${m.id})${roles ? ` [${roles}]` : ""}`;
      })
      .slice(0, 30);
    lines.push(`\nMembers (${members.length} shown):\n${members.join("\n")}`);
  } catch {
    lines.push("\nMembers: unavailable");
  }

  try {
    const channelName = "name" in channel ? (channel as { name: string }).name : "unknown";
    lines.push(`\nCurrent channel: #${channelName} (ID: ${channel.id})`);

    if ("messages" in channel) {
      const msgs = await (channel as { messages: { fetch: (opts: { limit: number }) => Promise<Map<string, { author: { username: string; id: string; bot: boolean }; content: string }>> } }).messages.fetch({ limit: CONTEXT_MESSAGE_LIMIT });
      const recent = Array.from(msgs.values())
        .filter((m) => !m.author.bot && m.content.trim())
        .slice(0, CONTEXT_MESSAGE_LIMIT)
        .reverse()
        .map((m) => `  [${m.author.username}]: ${m.content.slice(0, 200)}`);
      if (recent.length > 0) {
        lines.push(`\nRecent channel messages:\n${recent.join("\n")}`);
      }
    }
  } catch {
    lines.push("\nChannel history: unavailable");
  }

  try {
    const channels = guild.channels.cache
      .filter((c) => c.isTextBased())
      .map((c) => `  - #${c.name} (ID: ${c.id})`)
      .slice(0, 20);
    lines.push(`\nText channels:\n${channels.join("\n")}`);
  } catch {
    lines.push("\nChannels: unavailable");
  }

  return lines.join("\n");
}
