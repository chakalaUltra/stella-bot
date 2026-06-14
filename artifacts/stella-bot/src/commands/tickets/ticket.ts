import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed, successEmbed, errorEmbed } from "../../utils/embed.js";
import { checkPermissions } from "../../utils/permissions.js";
import { guildDb, ticketDb } from "../../database/db.js";
import { COLORS, EMOJIS, BOT_FOOTER, TICKET_PREFIX } from "../../config.js";

export default {
  category: "Tickets",
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage the ticket system")
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("Send the ticket panel to a channel")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Channel to send the panel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
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
          o.setName("log_channel")
            .setDescription("Channel for ticket logs")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(o =>
          o.setName("category")
            .setDescription("Category for ticket channels")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
    )
    .addSubcommand(s =>
      s.setName("rename")
        .setDescription("Rename the current ticket channel")
        .addStringOption(o => o.setName("name").setDescription("New name for the ticket").setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageGuild], "ticket")) return;

      const channel = interaction.options.getChannel("channel", true) as TextChannel;

      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.TICKET} Support Tickets`)
        .setDescription(
          `> Need help? We're here for you!\n\nClick the button below to open a support ticket and our team will assist you as soon as possible.\n\n**📋 Before opening a ticket:**\n• Be specific about your issue\n• Include any relevant screenshots\n• Be patient and respectful`
        )
        .setFooter({ text: BOT_FOOTER })
        .setTimestamp();

      const openBtn = new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Open a Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(openBtn);

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        embeds: [successEmbed("Ticket Panel Created", `The ticket panel has been sent to <#${channel.id}>.`)],
        ephemeral: true,
      });
    }

    if (sub === "close") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) {
        return interaction.reply({ embeds: [errorEmbed("This channel is not a ticket.")], ephemeral: true });
      }

      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const settings = guildDb.get(interaction.guildId!);

      ticketDb.close(interaction.channelId);

      await interaction.reply({
        embeds: [
          createEmbed({
            title: `${EMOJIS.LOCK} Ticket Closing`,
            description: `Ticket closed by <@${interaction.user.id}>.\n**Reason:** ${reason}\n\nChannel will be deleted in **5 seconds**.`,
            color: COLORS.PRIMARY,
          }),
        ],
      });

      if (settings.ticket_log_channel) {
        const logCh = interaction.guild?.channels.cache.get(settings.ticket_log_channel) as TextChannel | undefined;
        if (logCh) {
          await logCh.send({
            embeds: [
              createEmbed({
                title: `${EMOJIS.LOCK} Ticket Closed`,
                description: `Ticket #${ticket.ticket_number} closed.`,
                color: COLORS.WARNING,
                fields: [
                  { name: "User", value: `<@${ticket.user_id}>`, inline: true },
                  { name: "Closed by", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "Reason", value: reason },
                ],
              }),
            ],
          });
        }
      }

      setTimeout(async () => {
        await interaction.channel?.delete().catch(() => null);
      }, 5000);
    }

    if (sub === "add") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) {
        return interaction.reply({ embeds: [errorEmbed("This channel is not a ticket.")], ephemeral: true });
      }

      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "ticket")) return;

      const user = interaction.options.getUser("user", true);
      const channel = interaction.channel as TextChannel;

      await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        EmbedLinks: true,
      });

      return interaction.reply({
        embeds: [successEmbed("User Added", `<@${user.id}> has been added to this ticket.`)],
      });
    }

    if (sub === "remove") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) {
        return interaction.reply({ embeds: [errorEmbed("This channel is not a ticket.")], ephemeral: true });
      }

      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "ticket")) return;

      const user = interaction.options.getUser("user", true);

      if (user.id === ticket.user_id) {
        return interaction.reply({ embeds: [errorEmbed("You cannot remove the ticket creator.")], ephemeral: true });
      }

      const channel = interaction.channel as TextChannel;
      await channel.permissionOverwrites.delete(user.id);

      return interaction.reply({
        embeds: [successEmbed("User Removed", `<@${user.id}> has been removed from this ticket.`)],
      });
    }

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
        const settings = guildDb.get(interaction.guildId!);
        return interaction.reply({
          embeds: [
            createEmbed({
              title: `${EMOJIS.TICKET} Ticket Settings`,
              color: COLORS.PRIMARY,
              fields: [
                { name: "Support Role", value: settings.ticket_support_role ? `<@&${settings.ticket_support_role}>` : "Not set", inline: true },
                { name: "Log Channel", value: settings.ticket_log_channel ? `<#${settings.ticket_log_channel}>` : "Not set", inline: true },
                { name: "Category", value: settings.ticket_category ? `<#${settings.ticket_category}>` : "Not set", inline: true },
                { name: "Total Tickets", value: `${settings.ticket_count}`, inline: true },
              ],
            }),
          ],
        });
      }

      guildDb.update(interaction.guildId!, updates as never);
      return interaction.reply({
        embeds: [successEmbed("Settings Updated", "Ticket system settings have been updated.")],
        ephemeral: true,
      });
    }

    if (sub === "rename") {
      const ticket = ticketDb.getByChannel(interaction.channelId);
      if (!ticket) {
        return interaction.reply({ embeds: [errorEmbed("This channel is not a ticket.")], ephemeral: true });
      }

      if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageChannels], "ticket")) return;

      const name = interaction.options.getString("name", true).toLowerCase().replace(/\s+/g, "-");
      await (interaction.channel as TextChannel).setName(`${TICKET_PREFIX}${name}`);

      return interaction.reply({
        embeds: [successEmbed("Ticket Renamed", `This ticket has been renamed to **${TICKET_PREFIX}${name}**.`)],
      });
    }
  },
};
