import {
  type Interaction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  Collection,
} from "discord.js";
import type { StellaClient } from "../client.js";
import { errorEmbed, createEmbed } from "../utils/embed.js";
import { guildDb, ticketDb } from "../database/db.js";
import { COLORS, BOT_FOOTER, EMOJIS, TICKET_PREFIX } from "../config.js";

export default {
  name: "interactionCreate",
  once: false,
  async execute(interaction: Interaction, client: StellaClient) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name)!;
      const cooldownAmount = (command.cooldown ?? 3) * 1000;
      const userId = interaction.user.id;

      if (timestamps.has(userId)) {
        const expireTime = timestamps.get(userId)! + cooldownAmount;
        if (now < expireTime) {
          const timeLeft = ((expireTime - now) / 1000).toFixed(1);
          return interaction.reply({
            embeds: [errorEmbed(`Please wait **${timeLeft}s** before using \`/${command.data.name}\` again.`)],
            ephemeral: true,
          });
        }
      }

      timestamps.set(userId, now);
      setTimeout(() => timestamps.delete(userId), cooldownAmount);

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Command Error] ${interaction.commandName}:`, err);
        const reply = {
          embeds: [errorEmbed("An error occurred while executing this command.")],
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => null);
        } else {
          await interaction.reply(reply).catch(() => null);
        }
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        await command.autocomplete(interaction, client).catch(() => null);
      }
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction, client);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction, client);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction, client);
      return;
    }
  },
};

async function handleButton(interaction: ButtonInteraction, _client: StellaClient) {
  const { customId, guild, member } = interaction;
  if (!guild || !member) return;

  if (customId === "create_ticket") {
    const settings = guildDb.get(guild.id);

    const existingTicket = ticketDb.getByUser(guild.id, interaction.user.id);
    if (existingTicket) {
      return interaction.reply({
        embeds: [errorEmbed(`You already have an open ticket: <#${existingTicket.channel_id}>`)],
        ephemeral: true,
      });
    }

    const ticketNumber = guildDb.incrementTicketCount(guild.id);
    const channelName = `${TICKET_PREFIX}${String(ticketNumber).padStart(4, "0")}`;

    const category = settings.ticket_category
      ? guild.channels.cache.get(settings.ticket_category)
      : null;

    const overwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    if (settings.ticket_support_role) {
      overwrites.push({
        id: settings.ticket_support_role,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category?.id,
      permissionOverwrites: overwrites,
      topic: `Ticket #${ticketNumber} | Created by ${interaction.user.tag}`,
    });

    ticketDb.create(guild.id, ticketChannel.id, interaction.user.id, ticketNumber, null);

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.TICKET} Ticket #${String(ticketNumber).padStart(4, "0")}`)
      .setDescription(
        `Hello <@${interaction.user.id}>, thank you for opening a ticket!\n\nOur support team will be with you shortly. Please describe your issue in detail.`
      )
      .addFields(
        { name: "Created by", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Ticket #", value: `${ticketNumber}`, inline: true }
      )
      .setFooter({ text: BOT_FOOTER })
      .setTimestamp();

    const closeBtn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeBtn);

    await ticketChannel.send({
      content: `<@${interaction.user.id}>${settings.ticket_support_role ? ` <@&${settings.ticket_support_role}>` : ""}`,
      embeds: [embed],
      components: [row],
    });

    if (settings.ticket_log_channel) {
      const logChannel = guild.channels.cache.get(settings.ticket_log_channel) as TextChannel | undefined;
      if (logChannel) {
        await logChannel.send({
          embeds: [
            createEmbed({
              title: `${EMOJIS.TICKET} Ticket Opened`,
              description: `Ticket #${ticketNumber} opened by <@${interaction.user.id}>`,
              color: COLORS.SUCCESS,
              fields: [{ name: "Channel", value: `<#${ticketChannel.id}>` }],
            }),
          ],
        });
      }
    }

    return interaction.reply({
      embeds: [
        createEmbed({
          title: `${EMOJIS.CHECK} Ticket Created`,
          description: `Your ticket has been created: <#${ticketChannel.id}>`,
          color: COLORS.SUCCESS,
        }),
      ],
      ephemeral: true,
    });
  }

  if (customId === "close_ticket") {
    const ticket = ticketDb.getByChannel(interaction.channel!.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed("This channel is not a ticket.")],
        ephemeral: true,
      });
    }

    const confirmClose = new ButtonBuilder()
      .setCustomId("confirm_close_ticket")
      .setLabel("Yes, Close Ticket")
      .setStyle(ButtonStyle.Danger);

    const cancelClose = new ButtonBuilder()
      .setCustomId("cancel_close_ticket")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmClose, cancelClose);

    return interaction.reply({
      embeds: [
        warnEmbed(
          "Close Ticket",
          "Are you sure you want to close this ticket? This action cannot be undone."
        ),
      ],
      components: [row],
      ephemeral: true,
    });
  }

  if (customId === "confirm_close_ticket") {
    const ticket = ticketDb.getByChannel(interaction.channel!.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed("No ticket found for this channel.")],
        ephemeral: true,
      });
    }

    ticketDb.close(interaction.channel!.id);
    const settings = guildDb.get(guild.id);

    await interaction.reply({
      embeds: [
        createEmbed({
          title: `${EMOJIS.LOCK} Ticket Closing`,
          description: `Ticket closed by <@${interaction.user.id}>. Channel will be deleted in 5 seconds.`,
          color: COLORS.PRIMARY,
        }),
      ],
    });

    if (settings.ticket_log_channel) {
      const logChannel = guild.channels.cache.get(settings.ticket_log_channel) as TextChannel | undefined;
      if (logChannel) {
        await logChannel.send({
          embeds: [
            createEmbed({
              title: `${EMOJIS.LOCK} Ticket Closed`,
              description: `Ticket #${ticket.ticket_number} closed by <@${interaction.user.id}>`,
              color: COLORS.WARNING,
              fields: [
                { name: "Original User", value: `<@${ticket.user_id}>`, inline: true },
                { name: "Closed by", value: `<@${interaction.user.id}>`, inline: true },
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

  if (customId === "cancel_close_ticket") {
    return interaction.update({ content: "Ticket close cancelled.", components: [] });
  }
}

function warnEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle(`${EMOJIS.WARN} ${title}`)
    .setDescription(description)
    .setFooter({ text: BOT_FOOTER })
    .setTimestamp();
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction, _client: StellaClient) {
  // Future use
}

async function handleModal(interaction: ModalSubmitInteraction, _client: StellaClient) {
  // Future use
}
