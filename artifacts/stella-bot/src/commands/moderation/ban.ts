import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply, modReply } from "../../utils/ui.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";
import { sendModLog } from "../../utils/modlog.js";
import { CLR } from "../../utils/ui.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("user").setDescription("The user to ban").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason for the ban").setRequired(false))
    .addIntegerOption(o =>
      o.setName("delete_days").setDescription("Delete message history (days)").setMinValue(0).setMaxValue(7).setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.BanMembers], "ban")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.BanMembers])) return;

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    const member = interaction.guild?.members.cache.get(target.id);

    if (member) {
      if (!member.bannable) return interaction.reply({ ...errReply("I cannot ban this user — they may have a higher role."), ephemeral: true });
      if (member.id === interaction.user.id) return interaction.reply({ ...errReply("You cannot ban yourself."), ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await target.send({ ...errReply(`You were **banned** from **${interaction.guild?.name}**.\n**Reason:** ${reason}`) }).catch(() => null);
      await interaction.guild?.bans.create(target.id, {
        reason: `${reason} | Moderator: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 86400,
      });

      const extra: [string, string][] = [];
      if (deleteDays > 0) extra.push(["Messages deleted", `${deleteDays} day(s)`]);

      const replyOpts = modReply({
        action: "Banned", targetTag: target.tag, targetId: target.id,
        targetAvatar: target.displayAvatarURL({ size: 128 }),
        moderatorId: interaction.user.id, reason, extra,
      });

      await interaction.editReply(replyOpts);

      if (interaction.guild) {
        await sendModLog(interaction.guild, {
          action: "Banned", color: CLR.ERROR,
          targetTag: target.tag, targetId: target.id,
          targetAvatar: target.displayAvatarURL({ size: 128 }),
          moderatorId: interaction.user.id, reason, extra,
        });
      }
    } catch {
      await interaction.editReply(errReply("Failed to ban the user."));
    }
  },
};
