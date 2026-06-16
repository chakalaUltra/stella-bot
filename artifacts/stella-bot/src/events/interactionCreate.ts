import {
  type Interaction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  Collection,
  MessageFlags,
  ComponentType,
  SeparatorSpacingSize,
} from "discord.js";
import type { StellaClient } from "../client.js";
import { box, td, divider, sect, errReply, okReply, CLR, type V2Reply } from "../utils/ui.js";
import { guildDb, ticketDb } from "../database/db.js";
import { buildTranscript } from "../utils/transcript.js";
import { TICKET_PREFIX } from "../config.js";
import { activeGames, spinGrid, calcResult, buildGameMessage, buildSpinningMessage, type BetValue } from "../games/slots.js";
import { fetchKissGif } from "../utils/kiss.js";
import { buildKissCard } from "../commands/fun/kiss.js";

export default {
  name: "interactionCreate",
  once: false,
  async execute(interaction: Interaction, client: StellaClient) {
    // ── Slash commands ───────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Collection());

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name)!;
      const cooldownMs = (command.cooldown ?? 3) * 1000;
      const userId = interaction.user.id;

      if (timestamps.has(userId)) {
        const expireTime = timestamps.get(userId)! + cooldownMs;
        if (now < expireTime) {
          const timeLeft = ((expireTime - now) / 1000).toFixed(1);
          return interaction.reply({
            ...errReply(`Please wait **${timeLeft}s** before using \`/${command.data.name}\` again.`),
            ephemeral: true,
          });
        }
      }

      timestamps.set(userId, now);
      setTimeout(() => timestamps.delete(userId), cooldownMs);

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Command Error] ${interaction.commandName}:`, err);
        const reply = { ...errReply("An error occurred while executing this command."), ephemeral: true };
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
      if (command?.autocomplete) await command.autocomplete(interaction, client).catch(() => null);
      return;
    }

    if (interaction.isButton()) { await handleButton(interaction, client); return; }
    if (interaction.isStringSelectMenu()) { await handleSelectMenu(interaction, client); return; }
    if (interaction.isModalSubmit()) { await handleModal(interaction, client); return; }
  },
};

// ── Ticket close helper ──────────────────────────────────────────────────────

async function closeTicket(
  channel: TextChannel,
  guild: import("discord.js").Guild,
  closedById: string,
  closedByTag: string,
): Promise<void> {
  const ticket = ticketDb.getByChannel(channel.id);
  if (!ticket) return;

  ticketDb.close(channel.id);
  const settings = guildDb.get(guild.id);
  const ticketId = String(ticket.ticket_number).padStart(4, "0");

  // Fetch ticket creator info for transcript
  const creator = await guild.client.users.fetch(ticket.user_id).catch(() => null);
  const creatorTag = creator?.tag ?? `Unknown (${ticket.user_id})`;

  // Build transcript
  const transcript = await buildTranscript(channel, ticketId, creatorTag, closedByTag);

  // DM the transcript to the ticket creator
  if (creator) {
    await creator.send({
      ...okReply(`Ticket #${ticketId} Closed`, `Your ticket in **${guild.name}** has been closed.\n**Closed by:** ${closedByTag}`),
      files: [transcript],
    }).catch(() => null);
  }

  // Send to ticket log channel with transcript attached
  if (settings.ticket_log_channel) {
    const logChannel = guild.channels.cache.get(settings.ticket_log_channel) as TextChannel | undefined;
    if (logChannel) {
      await logChannel.send({
        components: [
          box(CLR.WARNING, [
            td(`## Ticket Closed · #${ticketId}`),
            divider(),
            td(`**User** · <@${ticket.user_id}>\n**Closed by** · <@${closedById}>\n**Channel** · #${channel.name}`),
          ]),
        ],
        flags: MessageFlags.IsComponentsV2,
        files: [transcript],
      } as unknown as import("discord.js").MessageCreateOptions).catch(() => null);
    }
  }
}

// ── Button handler ───────────────────────────────────────────────────────────

async function handleButton(interaction: ButtonInteraction, _client: StellaClient) {
  const { customId, guild, member } = interaction;
  if (!guild || !member) return;

  // ─ Create ticket ──────────────────────────────────────────────────────────
  if (customId === "create_ticket") {
    const settings = guildDb.get(guild.id);

    const existingTicket = ticketDb.getByUser(guild.id, interaction.user.id);
    if (existingTicket) {
      return interaction.reply({
        ...errReply(`You already have an open ticket: <#${existingTicket.channel_id}>`),
        ephemeral: true,
      });
    }

    const ticketNumber = guildDb.incrementTicketCount(guild.id);
    const ticketId = String(ticketNumber).padStart(4, "0");
    const channelName = `${TICKET_PREFIX}${ticketId}`;

    const category = settings.ticket_category ? guild.channels.cache.get(settings.ticket_category) : null;

    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    if (settings.ticket_support_role) {
      overwrites.push({
        id: settings.ticket_support_role,
        allow: [
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category?.id,
      permissionOverwrites: overwrites,
      topic: `Ticket #${ticketId} | Created by ${interaction.user.tag}`,
    });

    ticketDb.create(guild.id, ticketChannel.id, interaction.user.id, ticketNumber, null);

    const closeBtn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeBtn);

    // Mention inside TextDisplay — triggers ping without the forbidden 'content' field
    const mentionLine = settings.ticket_support_role
      ? `<@${interaction.user.id}> <@&${settings.ticket_support_role}>`
      : `<@${interaction.user.id}>`;

    await ticketChannel.send({
      components: [
        box(CLR.PRIMARY, [
          td(mentionLine),
          sect(
            `## Ticket #${ticketId}\n-# Opened by ${interaction.user.username}`,
            interaction.user.displayAvatarURL({ size: 128 })
          ),
          divider(),
          td("Please describe your issue in as much detail as possible. Our support team will be with you shortly."),
        ]),
        row,
      ],
      flags: MessageFlags.IsComponentsV2,
    } as V2Reply);

    if (settings.ticket_log_channel) {
      const logChannel = guild.channels.cache.get(settings.ticket_log_channel) as TextChannel | undefined;
      if (logChannel) {
        await logChannel.send({
          components: [
            box(CLR.SUCCESS, [
              td(`## Ticket Opened · #${ticketId}`),
              divider(),
              td(`**User** · <@${interaction.user.id}>\n**Channel** · <#${ticketChannel.id}>`),
            ]),
          ],
          flags: MessageFlags.IsComponentsV2,
        } as unknown as import("discord.js").MessageCreateOptions);
      }
    }

    return interaction.reply({
      ...okReply("Ticket Created", `Your ticket has been created: <#${ticketChannel.id}>`),
      ephemeral: true,
    });
  }

  // ─ Close ticket (confirm dialog) ──────────────────────────────────────────
  if (customId === "close_ticket") {
    const ticket = ticketDb.getByChannel(interaction.channel!.id);
    if (!ticket) return interaction.reply({ ...errReply("This channel is not a ticket."), ephemeral: true });

    const confirmBtn = new ButtonBuilder()
      .setCustomId("confirm_close_ticket")
      .setLabel("Yes, Close Ticket")
      .setStyle(ButtonStyle.Danger);

    const cancelBtn = new ButtonBuilder()
      .setCustomId("cancel_close_ticket")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

    return interaction.reply({
      components: [
        box(CLR.WARNING, [td("## Close Ticket?\nThis action cannot be undone. A transcript will be sent to the ticket creator.")]),
        row,
      ],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true,
    } as V2Reply);
  }

  // ─ Confirm close ──────────────────────────────────────────────────────────
  if (customId === "confirm_close_ticket") {
    const ticket = ticketDb.getByChannel(interaction.channel!.id);
    if (!ticket) return interaction.reply({ ...errReply("No ticket found for this channel."), ephemeral: true });

    await interaction.update({
      components: [
        box(CLR.WARNING, [
          td(`## Ticket Closing\nClosed by <@${interaction.user.id}>\n-# Generating transcript and deleting channel in 5 seconds…`),
        ]),
      ],
      flags: MessageFlags.IsComponentsV2,
    } as V2Reply);

    const channel = interaction.channel as TextChannel;
    await closeTicket(channel, guild, interaction.user.id, interaction.user.tag);

    setTimeout(() => channel.delete().catch(() => null), 5000);
    return;
  }

  // ─ Cancel close ───────────────────────────────────────────────────────────
  if (customId === "cancel_close_ticket") {
    return interaction.update({
      components: [box(CLR.SUCCESS, [td("Ticket close cancelled.")])],
      flags: MessageFlags.IsComponentsV2,
    } as V2Reply);
  }

  // ── Slots — roll ──────────────────────────────────────────────────────────
  if (customId === "slots_roll") {
    const game = activeGames.get(interaction.user.id);
    if (!game || game.ended) return;

    if (game.balance < game.bet) {
      return interaction.update(buildGameMessage(game, null, "Not enough SC — lower your bet or end the game."));
    }

    // Show spinning state immediately
    await interaction.update(buildSpinningMessage(game));

    // Calculate result
    const grid = spinGrid();
    const { payout, label } = calcResult(grid[1], game.bet);
    game.balance = game.balance - game.bet + payout;
    if (game.balance < 0) game.balance = 0;
    if (game.balance === 0) game.ended = true;

    // Brief pause for animation effect, then reveal result
    await new Promise(r => setTimeout(r, 1400));
    await interaction.editReply(buildGameMessage(game, grid, label) as V2Reply);
    return;
  }

  // ── Slots — end ───────────────────────────────────────────────────────────
  if (customId === "slots_end") {
    const game = activeGames.get(interaction.user.id);
    if (!game) return;

    game.ended = true;
    activeGames.delete(interaction.user.id);

    return interaction.update(buildGameMessage(game, null, null));
  }

  // ── Kiss — kiss back ───────────────────────────────────────────────────────
  if (customId.startsWith("kiss_back:")) {
    const parts = customId.split(":");
    const kisserId = parts[1]!;
    const kissedId = parts[2]!;

    if (interaction.user.id !== kissedId) {
      return interaction.reply({ ...errReply("This button isn't for you!"), ephemeral: true });
    }

    const gifUrl = await fetchKissGif();
    const card = buildKissCard(kisserId, kissedId, gifUrl, true);

    return interaction.update({
      components: [card],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [kisserId] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction, _client: StellaClient) {
  // ── Slots — bet selector ──────────────────────────────────────────────────
  if (interaction.customId === "slots_bet") {
    const game = activeGames.get(interaction.user.id);
    if (!game) return interaction.update({ components: [], flags: MessageFlags.IsComponentsV2 } as V2Reply);

    const newBet = parseInt(interaction.values[0]!, 10) as BetValue;
    game.bet = newBet;

    return interaction.update(buildGameMessage(game, null, null));
  }
}

async function handleModal(_interaction: ModalSubmitInteraction, _client: StellaClient) {
  // Future use
}
