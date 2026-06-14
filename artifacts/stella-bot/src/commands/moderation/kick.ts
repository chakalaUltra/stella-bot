import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { StellaClient } from "../../client.js";
import { modEmbed, errorEmbed } from "../../utils/embed.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";
import { EMOJIS } from "../../config.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("user").setDescription("The user to kick").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason for the kick").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.KickMembers], "kick")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.KickMembers])) return;

    const rawTarget = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    if (!rawTarget || typeof rawTarget === "string") {
      return interaction.reply({ embeds: [errorEmbed("That user is not in this server.")], ephemeral: true });
    }

    const target = rawTarget as GuildMember;

    if (!target.kickable) {
      return interaction.reply({ embeds: [errorEmbed("I cannot kick this user.")], ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed("You cannot kick yourself.")], ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await target.send({
        embeds: [errorEmbed(`You have been **kicked** from **${interaction.guild?.name}**.\n**Reason:** ${reason}`)],
      }).catch(() => null);

      await target.kick(`${reason} | Moderator: ${interaction.user.tag}`);

      await interaction.editReply({
        embeds: [
          modEmbed({
            action: "Member Kicked",
            emoji: EMOJIS.KICK,
            target: `${target.user.tag} (${target.id})`,
            moderator: `<@${interaction.user.id}>`,
            reason,
          }),
        ],
      });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to kick the user.")] });
    }
  },
};
