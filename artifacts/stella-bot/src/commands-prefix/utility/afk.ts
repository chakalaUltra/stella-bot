import { EmbedBuilder, GuildMember } from "discord.js";
import { CLR } from "../../utils/ui.js";
import { afkStore } from "../../state/afk.js";
import type { PrefixCommand } from "../../types.js";

export default {
  name: "afk",
  aliases: ["away"],
  description: "Set your AFK status",
  usage: "s!afk [reason]",
  category: "Utility",
  async execute(message, args) {
    const reason = args.join(" ") || "AFK";
    const member = message.member as GuildMember;

    if (afkStore.has(message.author.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(CLR.PRIMARY)
            .setDescription("You're already AFK. Send any message to remove your status."),
        ],
      });
    }

    const originalNickname = member.nickname ?? null;
    const displayName = member.displayName;
    const afkNick = `AFK // ${displayName}`.slice(0, 32);

    afkStore.set(message.author.id, { reason, since: Date.now(), originalNickname });

    await member.setNickname(afkNick).catch(() => null);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(CLR.PRIMARY)
          .setDescription(`💤 You're now AFK — **${reason}**`),
      ],
    });
  },
} satisfies PrefixCommand;
