import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply, modReply, CLR } from "../../utils/ui.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";
import { sendModLog } from "../../utils/modlog.js";

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

    if (!rawTarget || typeof rawTarget === "string") return interaction.reply({ ...errReply("That user is not in this server."), ephemeral: true });
    const target = rawTarget as GuildMember;
    if (!target.kickable) return interaction.reply({ ...errReply("I cannot kick this user."), ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ ...errReply("You cannot kick yourself."), ephemeral: true });

    await interaction.deferReply();

    try {
      await target.send({ ...errReply(`You were **kicked** from **${interaction.guild?.name}**.\n**Reason:** ${reason}`) }).catch(() => null);
      await target.kick(`${reason} | Moderator: ${interaction.user.tag}`);

      await interaction.editReply(modReply({
        action: "Kicked", targetTag: target.user.tag, targetId: target.id,
        targetAvatar: target.user.displayAvatarURL({ size: 128 }),
        moderatorId: interaction.user.id, reason,
      }));

      if (interaction.guild) {
        await sendModLog(interaction.guild, {
          action: "Kicked", color: CLR.WARNING,
          targetTag: target.user.tag, targetId: target.id,
          targetAvatar: target.user.displayAvatarURL({ size: 128 }),
          moderatorId: interaction.user.id, reason,
        });
      }
    } catch {
      await interaction.editReply(errReply("Failed to kick the user."));
    }
  },
};
