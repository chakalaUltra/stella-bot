import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { modEmbed, errorEmbed, successEmbed } from "../../utils/embed.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";
import { EMOJIS } from "../../config.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("user").setDescription("The user to ban").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason for the ban").setRequired(false))
    .addIntegerOption(o =>
      o.setName("delete_days")
        .setDescription("Delete message history (days)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.BanMembers], "ban")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.BanMembers])) return;

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

    const member = interaction.guild?.members.cache.get(target.id);

    if (member) {
      if (!member.bannable) {
        return interaction.reply({
          embeds: [errorEmbed("I cannot ban this user. They may have a higher role than me.")],
          ephemeral: true,
        });
      }

      if (member.id === interaction.user.id) {
        return interaction.reply({
          embeds: [errorEmbed("You cannot ban yourself.")],
          ephemeral: true,
        });
      }
    }

    await interaction.deferReply();

    try {
      await target.send({
        embeds: [
          errorEmbed(`You have been **banned** from **${interaction.guild?.name}**.\n**Reason:** ${reason}`),
        ],
      }).catch(() => null);

      await interaction.guild?.bans.create(target.id, {
        reason: `${reason} | Moderator: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 86400,
      });

      await interaction.editReply({
        embeds: [
          modEmbed({
            action: "Member Banned",
            emoji: EMOJIS.BAN,
            target: `${target.tag} (${target.id})`,
            moderator: `<@${interaction.user.id}>`,
            reason,
            extra: deleteDays > 0 ? [{ name: "Messages Deleted", value: `${deleteDays} day(s)` }] : [],
          }),
        ],
      });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to ban the user.")] });
    }
  },
};
