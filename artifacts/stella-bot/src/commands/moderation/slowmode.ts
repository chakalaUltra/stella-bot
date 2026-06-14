import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, TextChannel } from "discord.js";
import type { StellaClient } from "../../client.js";
import { okReply } from "../../utils/ui.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set slowmode for the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o =>
      o.setName("seconds").setDescription("Slowmode in seconds (0 to disable)").setRequired(true).setMinValue(0).setMaxValue(21600)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "slowmode")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageChannels])) return;

    const seconds = interaction.options.getInteger("seconds", true);
    const channel = interaction.channel as TextChannel;

    await channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`);

    if (seconds === 0) {
      return interaction.reply(okReply("Slowmode Disabled", `Slowmode removed from <#${channel.id}>.`));
    }

    return interaction.reply(okReply("Slowmode Set", `<#${channel.id}> now has a **${seconds}s** cooldown per message.`));
  },
};
