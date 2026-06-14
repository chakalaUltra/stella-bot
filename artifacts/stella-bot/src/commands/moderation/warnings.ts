import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed, successEmbed, errorEmbed } from "../../utils/embed.js";
import { checkPermissions } from "../../utils/permissions.js";
import { warningDb } from "../../database/db.js";
import { COLORS, EMOJIS } from "../../config.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Manage warnings for a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s =>
      s.setName("list").setDescription("List all warnings for a user")
        .addUserOption(o => o.setName("user").setDescription("The user").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("clear").setDescription("Clear all warnings for a user")
        .addUserOption(o => o.setName("user").setDescription("The user").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("remove").setDescription("Remove a specific warning by ID")
        .addIntegerOption(o => o.setName("id").setDescription("The warning ID").setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ModerateMembers], "warnings")) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      const target = interaction.options.getUser("user", true);
      const warns = warningDb.getAll(interaction.guildId!, target.id);

      if (warns.length === 0) {
        return interaction.reply({
          embeds: [
            createEmbed({
              title: `${EMOJIS.SHIELD} Warnings — ${target.username}`,
              description: "This user has no warnings. Clean record! ✨",
              color: COLORS.SUCCESS,
            }),
          ],
        });
      }

      const fields = warns.slice(0, 10).map((w, i) => ({
        name: `#${i + 1} — ID: ${w.id}`,
        value: `**Reason:** ${w.reason}\n**By:** <@${w.moderator_id}> • <t:${w.created_at}:R>`,
      }));

      return interaction.reply({
        embeds: [
          createEmbed({
            title: `${EMOJIS.WARN} Warnings — ${target.username}`,
            description: `**${warns.length}** warning(s) total`,
            color: COLORS.WARNING,
            fields,
            thumbnail: target.displayAvatarURL(),
          }),
        ],
      });
    }

    if (sub === "clear") {
      const target = interaction.options.getUser("user", true);
      const count = warningDb.clear(interaction.guildId!, target.id);

      return interaction.reply({
        embeds: [successEmbed("Warnings Cleared", `Cleared **${count}** warning(s) for ${target.tag}.`)],
      });
    }

    if (sub === "remove") {
      const id = interaction.options.getInteger("id", true);
      warningDb.remove(id);
      return interaction.reply({
        embeds: [successEmbed("Warning Removed", `Warning **#${id}** has been removed.`)],
      });
    }
  },
};
