import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { StellaClient } from "../../client.js";
import { modEmbed, errorEmbed } from "../../utils/embed.js";
import { checkPermissions, checkBotPermissions, parseDuration, formatDuration } from "../../utils/permissions.js";
import { EMOJIS } from "../../config.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("user").setDescription("The user to timeout").setRequired(true))
    .addStringOption(o =>
      o.setName("duration")
        .setDescription("Duration (e.g. 10m, 1h, 1d — max 28d)")
        .setRequired(true)
    )
    .addStringOption(o => o.setName("reason").setDescription("Reason for the timeout").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ModerateMembers], "timeout")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ModerateMembers])) return;

    const rawTarget = interaction.options.getMember("user");
    const durationStr = interaction.options.getString("duration", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    if (!rawTarget || typeof rawTarget === "string") {
      return interaction.reply({ embeds: [errorEmbed("That user is not in this server.")], ephemeral: true });
    }

    const target = rawTarget as GuildMember;

    const duration = parseDuration(durationStr);
    if (!duration) {
      return interaction.reply({
        embeds: [errorEmbed("Invalid duration format. Use: `10s`, `5m`, `2h`, `1d`")],
        ephemeral: true,
      });
    }

    const maxDuration = 28 * 24 * 60 * 60 * 1000;
    if (duration > maxDuration) {
      return interaction.reply({ embeds: [errorEmbed("Maximum timeout duration is 28 days.")], ephemeral: true });
    }

    if (!target.moderatable) {
      return interaction.reply({ embeds: [errorEmbed("I cannot timeout this user.")], ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await target.timeout(duration, `${reason} | Moderator: ${interaction.user.tag}`);

      await interaction.editReply({
        embeds: [
          modEmbed({
            action: "Member Timed Out",
            emoji: EMOJIS.MUTE,
            target: `${target.user.tag} (${target.id})`,
            moderator: `<@${interaction.user.id}>`,
            reason,
            extra: [{ name: `${EMOJIS.CLOCK} Duration`, value: formatDuration(duration) }],
          }),
        ],
      });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to timeout the user.")] });
    }
  },
};
