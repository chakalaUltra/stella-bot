import { cardReply, infoReply, CLR } from "../../utils/ui.js";
import { guildDb } from "../../database/db.js";
import { BOT_NAME, DEFAULT_PREFIX } from "../../config.js";
import type { PrefixCommand } from "../../types.js";

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
      if (!cmd) return message.reply(cardReply(`No prefix command named \`${args[0]}\` exists.`, CLR.ERROR));

      return message.reply(infoReply({
        title: `${prefix}${cmd.name}`,
        subtitle: cmd.description,
        rows: [
          ["Usage", `\`${cmd.usage.replace("s!", prefix)}\``],
          ["Aliases", cmd.aliases?.map(a => `\`${prefix}${a}\``).join(", ") || "None"],
          ["Cooldown", `${cmd.cooldown ?? 3}s`],
          ["Category", cmd.category],
        ],
      }));
    }

    const categories = new Map<string, PrefixCommand[]>();
    const seen = new Set<string>();

    for (const [, cmd] of client.prefixCommands) {
      if (seen.has(cmd.name)) continue;
      seen.add(cmd.name);
      if (!categories.has(cmd.category)) categories.set(cmd.category, []);
      categories.get(cmd.category)!.push(cmd);
    }

    const overview = [...categories.entries()]
      .map(([cat, cmds]) => `**${cat}**\n${cmds.map(c => `\`${prefix}${c.name}\``).join(" ")}`)
      .join("\n\n");

    return message.reply(cardReply(
      `## ${BOT_NAME} — Prefix Commands\n-# Prefix: \`${prefix}\` · Use \`${prefix}help <command>\` for details\n\n${overview}`,
      CLR.PRIMARY
    ));
  },
} satisfies PrefixCommand;
