import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply, modReply, CLR } from "../../utils/ui.js";
import { checkPermissions } from "../../utils/permissions.js";
import { warningDb } from "../../database/db.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("user").setDescription("The user to warn").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason for the warning").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ModerateMembers], "warn")) return;

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    if (target.id === interaction.user.id) return interaction.reply({ ...errReply("You cannot warn yourself."), ephemeral: true });
    if (target.bot) return interaction.reply({ ...errReply("You cannot warn a bot."), ephemeral: true });

    await interaction.deferReply();

    warningDb.add(interaction.guildId!, target.id, interaction.user.id, reason);
    const total = warningDb.count(interaction.guildId!, target.id);

    await target.send({
      ...errReply(`You received a warning in **${interaction.guild?.name}**.\n**Reason:** ${reason}\n**Total warnings:** ${total}`),
    }).catch(() => null);

    await interaction.editReply(modReply({
      action: "Warned",
      targetTag: target.tag,
      targetId: target.id,
      targetAvatar: target.displayAvatarURL({ size: 128 }),
      moderatorId: interaction.user.id,
      reason,
      extra: [["Total warnings", `${total}`]],
      color: CLR.WARNING,
    }));
  },
};
