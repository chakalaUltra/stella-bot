import { SlashCommandBuilder, type ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { StellaClient } from "../../client.js";
import { infoReply, CLR } from "../../utils/ui.js";
import { warningDb } from "../../database/db.js";

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Display information about a user")
    .addUserOption(o => o.setName("user").setDescription("The user to look up (defaults to you)").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const target = interaction.options.getMember("user") ?? interaction.member;
    if (!target || typeof target === "string" || !(target instanceof GuildMember)) {
      return interaction.reply({ content: "Could not find that user.", ephemeral: true });
    }

    const user = target.user;
    const warnings = warningDb.count(interaction.guildId!, user.id);
    const roles = target.roles.cache
      .filter(r => r.id !== interaction.guild!.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .slice(0, 8)
      .join(" ") || "None";

    const badges: string[] = [];
    if (user.flags) {
      const flagMap: Record<string, string> = {
        Staff: "Discord Staff",
        Partner: "Discord Partner",
        Hypesquad: "HypeSquad Events",
        BugHunterLevel1: "Bug Hunter",
        BugHunterLevel2: "Bug Hunter Gold",
        HypeSquadOnlineHouse1: "House Bravery",
        HypeSquadOnlineHouse2: "House Brilliance",
        HypeSquadOnlineHouse3: "House Balance",
        PremiumEarlySupporter: "Early Supporter",
        VerifiedBotDeveloper: "Verified Dev",
        ActiveDeveloper: "Active Dev",
      };
      for (const [flag, label] of Object.entries(flagMap)) {
        if (user.flags.has(flag as never)) badges.push(label);
      }
    }

    const color = target.displayHexColor !== "#000000"
      ? parseInt(target.displayHexColor.replace("#", ""), 16)
      : CLR.PRIMARY;

    const rows: [string, string][] = [
      ["User ID", `\`${user.id}\``],
      ["Account created", `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`],
      ["Joined server", target.joinedAt ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:R>` : "Unknown"],
      ["Bot", user.bot ? "Yes" : "No"],
      ["Warnings", `${warnings}`],
      ["Roles", roles],
    ];

    if (badges.length > 0) rows.push(["Badges", badges.join(", ")]);

    return interaction.reply(infoReply({
      title: user.username,
      subtitle: user.bot ? "Bot account" : target.nickname ? `aka ${target.nickname}` : null,
      thumbnail: user.displayAvatarURL({ size: 256 }),
      rows,
      color,
    }));
  },
};
