import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, okReply, infoReply, CLR } from "../../utils/ui.js";
import { checkPermissions } from "../../utils/permissions.js";
import { warningDb } from "../../database/db.js";

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
        return interaction.reply(cardReply(
          `## ${target.username} — Warnings\nNo warnings on record.`,
          CLR.SUCCESS
        ));
      }

      const list = warns.slice(0, 10).map((w, i) =>
        `**#${i + 1}** · ID \`${w.id}\`\n${w.reason}\n-# By <@${w.moderator_id}> · <t:${w.created_at}:R>`
      ).join("\n\n");

      return interaction.reply(infoReply({
        title: `${target.username} — Warnings`,
        subtitle: `${warns.length} warning(s) total`,
        thumbnail: target.displayAvatarURL({ size: 128 }),
        rows: warns.slice(0, 10).map((w, i) => [
          `#${i + 1} (ID ${w.id})`,
          `${w.reason} · <@${w.moderator_id}> · <t:${w.created_at}:R>`,
        ]),
        color: CLR.WARNING,
      }));
    }

    if (sub === "clear") {
      const target = interaction.options.getUser("user", true);
      const count = warningDb.clear(interaction.guildId!, target.id);
      return interaction.reply(okReply("Warnings Cleared", `Removed **${count}** warning(s) from **${target.tag}**.`));
    }

    if (sub === "remove") {
      const id = interaction.options.getInteger("id", true);
      warningDb.remove(id);
      return interaction.reply(okReply("Warning Removed", `Warning **#${id}** has been deleted.`));
    }
  },
};
