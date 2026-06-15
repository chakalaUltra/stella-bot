import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import type { StellaClient } from "../../client.js";
import { okReply, errReply } from "../../utils/ui.js";
import { stickyStore } from "../../state/sticky.js";

export default {
  category: "Utility",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("stickymessage")
    .setDescription("Keep a message pinned to the bottom of a channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(s =>
      s.setName("set")
        .setDescription("Set a sticky message in this channel")
        .addStringOption(o =>
          o.setName("message").setDescription("The message to keep at the bottom").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("remove").setDescription("Remove the sticky message from this channel")
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ ...errReply("You need **Manage Messages** permission."), ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const channelId = interaction.channelId;

    if (sub === "set") {
      const content = interaction.options.getString("message", true);

      const existing = stickyStore.get(channelId);
      if (existing?.messageId) {
        const ch = interaction.channel as TextChannel;
        await ch.messages.delete(existing.messageId).catch(() => null);
      }

      const ch = interaction.channel as TextChannel;
      const sent = await ch.send(`📌 **Sticky:** ${content}`);
      stickyStore.set(channelId, { content, messageId: sent.id });

      return interaction.reply({ ...okReply("Sticky Set", `A sticky message has been pinned to this channel.`), ephemeral: true });
    }

    if (sub === "remove") {
      const existing = stickyStore.get(channelId);
      if (!existing) {
        return interaction.reply({ ...errReply("There is no sticky message in this channel."), ephemeral: true });
      }

      if (existing.messageId) {
        const ch = interaction.channel as TextChannel;
        await ch.messages.delete(existing.messageId).catch(() => null);
      }

      stickyStore.delete(channelId);
      return interaction.reply({ ...okReply("Sticky Removed", "The sticky message has been removed."), ephemeral: true });
    }
  },
};
