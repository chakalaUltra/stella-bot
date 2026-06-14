import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, TextChannel } from "discord.js";
import type { StellaClient } from "../../client.js";
import { okReply } from "../../utils/ui.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "unlock")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageChannels])) return;

    const channel = interaction.channel as TextChannel;

    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      SendMessages: null,
    }, { reason: `Unlocked by ${interaction.user.tag}` });

    return interaction.reply(okReply("Channel Unlocked", `<#${channel.id}> is now open.`));
  },
};
