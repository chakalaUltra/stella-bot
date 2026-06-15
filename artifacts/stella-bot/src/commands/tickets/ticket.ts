import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextChannel,
  MessageFlags,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { box, td, divider, errReply, okReply, infoReply, CLR, type V2Reply } from "../../utils/ui.js";
import { checkPermissions } from "../../utils/permissions.js";
import { guildDb, ticketDb } from "../../database/db.js";
import { buildTranscript } from "../../utils/transcript.js";
import { TICKET_PREFIX } from "../../config.js";

export default {
  category: "Tickets",
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage the ticket system")
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("Send the ticket panel to a channel")
        .addChannelOption(o =>
          o.setName("channel").setDescription("Channel to send the panel").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("close")
        .setDescription("Close the current ticket")
        .addStringOption(o => o.setName("reason").setDescription("Reason for closing").setRequired(false))
    )
    .addSubcommand(s =>
      s.setName("add")
        .setDescription("Add a user to the current ticket")
        .addUserOption(o => o.setName("user").setDescription("User to add").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("remove")
        .setDescription("Remove a user from the current ticket")
        .addUserOption(o => o.setName("user").setDescription("User to remove").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("settings")
        .setDescription("Configure the ticket system")
        .addRoleOption(o => o.setName("support_role").setDescription("Role that can see all tickets").setRequired(false))
        .addChannelOption(o =>
          o.setName("log_channel").setDescription("Channel for ticket logs").addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
        .addChannelOption(o =>
          o.setName("category").setDescription("Category for ticket channels").addChannelTypes(ChannelType.GuildCategory).setRequired(false)
        )
    )
    .addSubcommand(s =>
      s.setName("rename")
        .setDescription("Rename the current ticket channel")
        .addStringOption(o => o.setName("name").setDescription("New name for the ticket").setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const sub = interaction.options.getSubcommand();

    // ── setup ───────────────────────────────────────────────────────────────
    if (sub === "setup") {
      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageGuild], "ticket")) return;
      const channel = interaction.options.getChannel("channel", true) as TextChannel;

      const openBtn = new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Open a Ticket")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(openBtn);

      await channel.send({
        components: [
          box(CLR.PRIMARY, [
            td("## Support Tickets\nNeed help? Our team is here to assist you."),
            divider(),
            td("**Before opening a ticket:**\n· Describe your issue clearly\n· Attach any relevant screenshots\n· Be patient and respectful"),
          ]),
          row,
        ],
        flags: MessageFlags.IsComponentsV2,
      } as V2Reply);

      return interaction.reply({ ...okReply("Panel Created", `Ticket panel sent to <#${channel.id}>.`), ephemeral: true });
    }

    // ── close ───────────────────────────────────────────────────────────────
    if (sub === "close") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ ...errReply("This channel is not a ticket."), ephemeral: true });

      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const settings = guildDb.get(interaction.guildId!);
      const channel = interaction.channel as TextChannel;
      const ticketId = String(ticket.ticket_number).padStart(4, "0");

      await interaction.deferReply();
      ticketDb.close(channel.id);

      // Build transcript
      const creator = await interaction.client.users.fetch(ticket.user_id).catch(() => null);
      const creatorTag = creator?.tag ?? `Unknown (${ticket.user_id})`;
      const transcript = await buildTranscript(channel, ticketId, creatorTag, interaction.user.tag);

      // DM transcript to ticket creator
      if (creator) {
        await creator.send({
          ...okReply(`Ticket #${ticketId} Closed`, `Your ticket in **${interaction.guild?.name}** has been closed.\n**Closed by:** ${interaction.user.tag}\n**Reason:** ${reason}`),
          files: [transcript],
        }).catch(() => null);
      }

      // Log to ticket log channel
      if (settings.ticket_log_channel) {
        const logCh = interaction.guild?.channels.cache.get(settings.ticket_log_channel) as TextChannel | undefined;
        if (logCh) {
          await logCh.send({
            components: [
              box(CLR.WARNING, [
                td(`## Ticket Closed · #${ticketId}`),
                divider(),
                td(`**User** · <@${ticket.user_id}>\n**Closed by** · <@${interaction.user.id}>\n**Reason** · ${reason}`),
              ]),
            ],
            flags: MessageFlags.IsComponentsV2,
            files: [transcript],
          } as unknown as import("discord.js").MessageCreateOptions);
        }
      }

      await interaction.editReply({
        components: [
          box(CLR.WARNING, [
            td(`## Ticket Closing\nClosed by <@${interaction.user.id}>\n**Reason:** ${reason}\n-# Transcript sent. Channel will be deleted in 5 seconds.`),
          ]),
        ],
        flags: MessageFlags.IsComponentsV2,
      } as V2Reply);

      setTimeout(() => channel.delete().catch(() => null), 5000);
      return;
    }

    // ── add ─────────────────────────────────────────────────────────────────
    if (sub === "add") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ ...errReply("This channel is not a ticket."), ephemeral: true });
      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "ticket")) return;

      const user = interaction.options.getUser("user", true);
      const channel = interaction.channel as TextChannel;

      await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true,
      });

      return interaction.reply(okReply("User Added", `<@${user.id}> has been added to this ticket.`));
    }

    // ── remove ──────────────────────────────────────────────────────────────
    if (sub === "remove") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ ...errReply("This channel is not a ticket."), ephemeral: true });
      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "ticket")) return;

      const user = interaction.options.getUser("user", true);
      if (user.id === ticket.user_id) return interaction.reply({ ...errReply("You cannot remove the ticket creator."), ephemeral: true });

      await (interaction.channel as TextChannel).permissionOverwrites.delete(user.id);
      return interaction.reply(okReply("User Removed", `<@${user.id}> has been removed from this ticket.`));
    }

    // ── settings ────────────────────────────────────────────────────────────
    if (sub === "settings") {
      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageGuild], "ticket")) return;

      const supportRole = interaction.options.getRole("support_role");
      const logChannel = interaction.options.getChannel("log_channel");
      const category = interaction.options.getChannel("category");

      const updates: Record<string, string | null> = {};
      if (supportRole) updates.ticket_support_role = supportRole.id;
      if (logChannel) updates.ticket_log_channel = logChannel.id;
      if (category) updates.ticket_category = category.id;

      if (Object.keys(updates).length === 0) {
        const s = guildDb.get(interaction.guildId!);
        return interaction.reply(infoReply({
          title: "Ticket Settings",
          thumbnail: interaction.guild?.iconURL({ size: 256 }),
          rows: [
            ["Support role", s.ticket_support_role ? `<@&${s.ticket_support_role}>` : "Not set"],
            ["Log channel", s.ticket_log_channel ? `<#${s.ticket_log_channel}>` : "Not set"],
            ["Category", s.ticket_category ? `<#${s.ticket_category}>` : "Not set"],
            ["Total tickets", `${s.ticket_count}`],
          ],
        }));
      }

      guildDb.update(interaction.guildId!, updates as never);
      return interaction.reply({ ...okReply("Settings Updated", "Ticket system has been configured."), ephemeral: true });
    }

    // ── rename ──────────────────────────────────────────────────────────────
    if (sub === "rename") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ ...errReply("This channel is not a ticket."), ephemeral: true });
      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "ticket")) return;

      const name = interaction.options.getString("name", true).toLowerCase().replace(/\s+/g, "-");
      await (interaction.channel as TextChannel).setName(`${TICKET_PREFIX}${name}`);
      return interaction.reply(okReply("Ticket Renamed", `Channel renamed to **${TICKET_PREFIX}${name}**.`));
    }
  },
};
