import { SlashCommandBuilder, type ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS } from "../../config.js";
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
      .slice(0, 10)
      .join(", ") || "None";

    const badges: string[] = [];
    if (user.flags) {
      const flagMap: Record<string, string> = {
        Staff: "👨‍💼 Discord Staff",
        Partner: "🤝 Discord Partner",
        Hypesquad: "🏠 HypeSquad Events",
        BugHunterLevel1: "🐛 Bug Hunter",
        BugHunterLevel2: "🐛 Bug Hunter Gold",
        HypeSquadOnlineHouse1: "⚡ Bravery",
        HypeSquadOnlineHouse2: "💫 Brilliance",
        HypeSquadOnlineHouse3: "⚖️ Balance",
        PremiumEarlySupporter: "🌟 Early Supporter",
        VerifiedBotDeveloper: "🛠️ Verified Dev",
        ActiveDeveloper: "🔥 Active Dev",
      };

      for (const [flag, label] of Object.entries(flagMap)) {
        if (user.flags.has(flag as never)) badges.push(label);
      }
    }

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `${EMOJIS.INFO} ${user.username}`,
          color: target.displayHexColor !== "#000000" ? parseInt(target.displayHexColor.replace("#", ""), 16) : COLORS.PRIMARY,
          thumbnail: user.displayAvatarURL({ size: 256 }),
          fields: [
            { name: "🆔 User ID", value: `\`${user.id}\``, inline: true },
            { name: "🤖 Bot", value: user.bot ? "Yes" : "No", inline: true },
            { name: "📅 Joined Discord", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "📅 Joined Server", value: target.joinedAt ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:R>` : "Unknown", inline: true },
            { name: "🎨 Display Color", value: target.displayHexColor, inline: true },
            { name: `${EMOJIS.WARN} Warnings`, value: `${warnings}`, inline: true },
            { name: "🏷️ Roles", value: roles, inline: false },
            ...(badges.length > 0 ? [{ name: "🏆 Badges", value: badges.join("\n"), inline: false }] : []),
          ],
        }),
      ],
    });
  },
};
