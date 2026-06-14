import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, TextChannel } from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply, okReply } from "../../utils/ui.js";
import { checkPermissions, checkBotPermissions } from "../../utils/permissions.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete multiple messages at once")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o =>
      o.setName("amount").setDescription("Number of messages to delete (1–100)").setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption(o => o.setName("user").setDescription("Only delete messages from this user").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageMessages], "purge")) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageMessages])) return;

    const amount = interaction.options.getInteger("amount", true);
    const targetUser = interaction.options.getUser("user");
    const channel = interaction.channel as TextChannel;

    await interaction.deferReply({ ephemeral: true });

    const messages = await channel.messages.fetch({ limit: 100 });
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    let toDelete = [...messages.values()].filter(m => m.createdTimestamp > twoWeeksAgo);
    if (targetUser) toDelete = toDelete.filter(m => m.author.id === targetUser.id);
    toDelete = toDelete.slice(0, amount);

    if (toDelete.length === 0) {
      return interaction.editReply(errReply("No messages to delete. Messages older than 14 days cannot be bulk deleted."));
    }

    const deleted = await channel.bulkDelete(toDelete, true);

    await interaction.editReply(okReply(
      "Purged",
      `Deleted **${deleted.size}** message(s)${targetUser ? ` from **${targetUser.tag}**` : ""}.`
    ));
  },
};
