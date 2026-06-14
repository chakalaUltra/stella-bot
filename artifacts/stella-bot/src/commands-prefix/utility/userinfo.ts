import { GuildMember } from "discord.js";
import { infoReply, CLR } from "../../utils/ui.js";
import { warningDb } from "../../database/db.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "userinfo",
  aliases: ["ui", "whois"],
  description: "Get info about a user",
  usage: "s!userinfo [@user]",
  category: "Utility",
  async execute(message, _args) {
    const target = (message.mentions.members?.first() ?? message.member) as GuildMember;
    if (!target) return;

    const user = target.user;
    const warnings = warningDb.count(message.guild!.id, user.id);
    const roles = target.roles.cache
      .filter(r => r.id !== message.guild!.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .slice(0, 8)
      .join(" ") || "None";

    const color = target.displayHexColor !== "#000000"
      ? parseInt(target.displayHexColor.replace("#", ""), 16)
      : CLR.PRIMARY;

    return message.reply(infoReply({
      title: user.username,
      subtitle: target.nickname ? `aka ${target.nickname}` : null,
      thumbnail: user.displayAvatarURL({ size: 256 }),
      rows: [
        ["User ID", `\`${user.id}\``],
        ["Joined Discord", `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`],
        ["Joined server", target.joinedAt ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:R>` : "Unknown"],
        ["Bot", user.bot ? "Yes" : "No"],
        ["Warnings", `${warnings}`],
        ["Roles", roles],
      ],
      color,
    }));
  },
} satisfies PrefixCommand;
