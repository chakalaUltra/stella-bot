import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, TextChannel } from "discord.js";
import type { StellaClient } from "../../client.js";
import { successEmbed, errorEmbed } from "../../utils/embed.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";
import { EMOJIS } from "../../config.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(o => o.setName("reason").setDescription("Reason for locking").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "lock")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageChannels])) return;

    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const channel = interaction.channel as TextChannel;

    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      SendMessages: false,
    }, { reason: `${reason} | Moderator: ${interaction.user.tag}` });

    return interaction.reply({
      embeds: [successEmbed(`${EMOJIS.LOCK} Channel Locked`, `This channel has been locked.\n**Reason:** ${reason}`)],
    });
  },
};
