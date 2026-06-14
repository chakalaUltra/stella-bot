import { createEmbed } from "../../utils/embed.js";
import { guildDb } from "../../database/db.js";
import { COLORS, EMOJIS, BOT_NAME, DEFAULT_PREFIX } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

const CATEGORY_EMOJIS: Record<string, string> = {
  Moderation: "🛡️",
  Utility: "🔧",
  Fun: "🎉",
  Settings: "⚙️",
};

export default {
  name: "help",
  aliases: ["h", "commands"],
  description: "List all prefix commands",
  usage: "s!help [command]",
  category: "Utility",
  async execute(message, args, client) {
    const prefix = message.guild ? (guildDb.get(message.guild.id).prefix ?? DEFAULT_PREFIX) : DEFAULT_PREFIX;

    if (args[0]) {
      const cmd = client.prefixCommands.get(args[0].toLowerCase());
      if (!cmd) return message.reply({ embeds: [createEmbed({ title: "❌ Command Not Found", description: `No prefix command named \`${args[0]}\` exists.`, color: COLORS.ERROR })] });

      return message.reply({
        embeds: [createEmbed({
          title: `${EMOJIS.INFO} ${prefix}${cmd.name}`,
          color: COLORS.PRIMARY,
          fields: [
            { name: "📋 Description", value: cmd.description },
            { name: "💡 Usage", value: `\`${cmd.usage.replace("s!", prefix)}\`` },
            { name: "🏷️ Aliases", value: cmd.aliases?.map(a => `\`${prefix}${a}\``).join(", ") || "None", inline: true },
            { name: "⏱️ Cooldown", value: `${cmd.cooldown ?? 3}s`, inline: true },
          ],
        })],
      });
    }

    const categories = new Map<string, PrefixCommand[]>();
    const seen = new Set<string>();

    for (const [, cmd] of client.prefixCommands) {
      if (seen.has(cmd.name)) continue;
      seen.add(cmd.name);
      if (!categories.has(cmd.category)) categories.set(cmd.category, []);
      categories.get(cmd.category)!.push(cmd);
    }

    return message.reply({
      embeds: [createEmbed({
        title: `${EMOJIS.STAR} ${BOT_NAME} — Prefix Commands`,
        description: `> Prefix: \`${prefix}\` • Use \`${prefix}help <command>\` for details`,
        color: COLORS.PRIMARY,
        fields: [...categories.entries()].map(([cat, cmds]) => ({
          name: `${CATEGORY_EMOJIS[cat] ?? "📂"} ${cat}`,
          value: cmds.map(c => `\`${prefix}${c.name}\``).join(" "),
        })),
      })],
    });
  },
} satisfies PrefixCommand;
