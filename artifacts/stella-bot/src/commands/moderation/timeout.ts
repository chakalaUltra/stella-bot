import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply, modReply, CLR } from "../../utils/ui.js";
import { checkPermissions, checkBotPermissions, parseDuration, formatDuration } from "../../utils/permissions.js";
import { sendModLog } from "../../utils/modlog.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("user").setDescription("The user to timeout").setRequired(true))
    .addStringOption(o => o.setName("duration").setDescription("Duration e.g. 10m, 1h, 1d (max 28d)").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason for the timeout").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ModerateMembers], "timeout")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ModerateMembers])) return;

    const rawTarget = interaction.options.getMember("user");
    const durationStr = interaction.options.getString("duration", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    if (!rawTarget || typeof rawTarget === "string") return interaction.reply({ ...errReply("That user is not in this server."), ephemeral: true });
    const target = rawTarget as GuildMember;
    const duration = parseDuration(durationStr);

    if (!duration) return interaction.reply({ ...errReply("Invalid duration. Use: `10s`, `5m`, `2h`, `1d`"), ephemeral: true });
    if (duration > 28 * 24 * 60 * 60 * 1000) return interaction.reply({ ...errReply("Maximum timeout duration is 28 days."), ephemeral: true });
    if (!target.moderatable) return interaction.reply({ ...errReply("I cannot timeout this user."), ephemeral: true });

    await interaction.deferReply();

    try {
      await target.timeout(duration, `${reason} | Moderator: ${interaction.user.tag}`);
      const extra: [string, string][] = [["Duration", formatDuration(duration)]];

      await interaction.editReply(modReply({
        action: "Timed Out", targetTag: target.user.tag, targetId: target.id,
        targetAvatar: target.user.displayAvatarURL({ size: 128 }),
        moderatorId: interaction.user.id, reason, extra, color: CLR.WARNING,
      }));

      if (interaction.guild) {
        await sendModLog(interaction.guild, {
          action: "Timed Out", color: CLR.WARNING,
          targetTag: target.user.tag, targetId: target.id,
          targetAvatar: target.user.displayAvatarURL({ size: 128 }),
          moderatorId: interaction.user.id, reason, extra,
        });
      }
    } catch {
      await interaction.editReply(errReply("Failed to timeout the user."));
    }
  },
};
