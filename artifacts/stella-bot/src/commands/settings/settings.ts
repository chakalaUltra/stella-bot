import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  ChannelType,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed, successEmbed, errorEmbed } from "../../utils/embed.js";
import { checkPermissions } from "../../utils/permissions.js";
import { guildDb, permissionDb } from "../../database/db.js";
import { COLORS, EMOJIS } from "../../config.js";

export default {
  category: "Settings",
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Manage server settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s =>
      s.setName("view").setDescription("View all current server settings")
    )
    .addSubcommand(s =>
      s.setName("logs")
        .setDescription("Set the moderation log channel")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("The log channel (leave empty to disable)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(s =>
      s.setName("welcome")
        .setDescription("Configure the welcome message")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Welcome channel (leave empty to disable)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(o =>
          o.setName("message")
            .setDescription("Welcome message. Use {user}, {username}, {server}, {count}")
            .setRequired(false)
        )
    )
    .addSubcommand(s =>
      s.setName("permissions")
        .setDescription("Set command permissions for a role")
        .addStringOption(o =>
          o.setName("command").setDescription("Command name (without /)").setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("role").setDescription("The role to configure").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("access")
            .setDescription("Allow or deny access")
            .setRequired(true)
            .addChoices(
              { name: "✅ Allow", value: "allow" },
              { name: "❌ Deny", value: "deny" },
              { name: "🗑️ Reset", value: "reset" }
            )
        )
    )
    .addSubcommand(s =>
      s.setName("viewperms")
        .setDescription("View all configured command permissions")
    ),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageGuild], "settings")) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "view") {
      const settings = guildDb.get(interaction.guildId!);

      return interaction.reply({
        embeds: [
          createEmbed({
            title: `${EMOJIS.SETTINGS} Server Settings — ${interaction.guild?.name}`,
            color: COLORS.PRIMARY,
            thumbnail: interaction.guild?.iconURL({ size: 256 }) ?? undefined,
            fields: [
              {
                name: "📋 Mod Log Channel",
                value: settings.log_channel ? `<#${settings.log_channel}>` : "Not set",
                inline: true,
              },
              {
                name: `${EMOJIS.BELL} Welcome Channel`,
                value: settings.welcome_channel ? `<#${settings.welcome_channel}>` : "Not set",
                inline: true,
              },
              {
                name: "💬 Welcome Message",
                value: settings.welcome_message ?? "Default message",
                inline: false,
              },
              {
                name: `${EMOJIS.TICKET} Ticket Support Role`,
                value: settings.ticket_support_role ? `<@&${settings.ticket_support_role}>` : "Not set",
                inline: true,
              },
              {
                name: `${EMOJIS.TICKET} Ticket Log Channel`,
                value: settings.ticket_log_channel ? `<#${settings.ticket_log_channel}>` : "Not set",
                inline: true,
              },
              {
                name: `${EMOJIS.TICKET} Ticket Category`,
                value: settings.ticket_category ? `<#${settings.ticket_category}>` : "Not set",
                inline: true,
              },
              {
                name: `${EMOJIS.TICKET} Total Tickets Created`,
                value: `${settings.ticket_count}`,
                inline: true,
              },
            ],
          }),
        ],
      });
    }

    if (sub === "logs") {
      const channel = interaction.options.getChannel("channel");

      guildDb.update(interaction.guildId!, { log_channel: channel?.id ?? null });

      if (!channel) {
        return interaction.reply({
          embeds: [successEmbed("Logs Disabled", "Moderation logging has been disabled.")],
          ephemeral: true,
        });
      }

      return interaction.reply({
        embeds: [successEmbed("Log Channel Set", `Moderation logs will now be sent to <#${channel.id}>.`)],
        ephemeral: true,
      });
    }

    if (sub === "welcome") {
      const channel = interaction.options.getChannel("channel");
      const message = interaction.options.getString("message");

      guildDb.update(interaction.guildId!, {
        welcome_channel: channel?.id ?? null,
        welcome_message: message ?? null,
      });

      if (!channel) {
        return interaction.reply({
          embeds: [successEmbed("Welcome Disabled", "Welcome messages have been disabled.")],
          ephemeral: true,
        });
      }

      const preview = message
        ? message.replace("{user}", `<@${interaction.user.id}>`).replace("{username}", interaction.user.username).replace("{server}", interaction.guild!.name).replace("{count}", `${interaction.guild!.memberCount}`)
        : `Welcome to **${interaction.guild!.name}**, <@${interaction.user.id}>! ✨ You are member #${interaction.guild!.memberCount}.`;

      return interaction.reply({
        embeds: [
          createEmbed({
            title: `${EMOJIS.CHECK} Welcome Settings Updated`,
            color: COLORS.SUCCESS,
            fields: [
              { name: "Channel", value: `<#${channel.id}>` },
              { name: "Message Preview", value: preview },
            ],
          }),
        ],
        ephemeral: true,
      });
    }

    if (sub === "permissions") {
      const commandName = interaction.options.getString("command", true).toLowerCase();
      const role = interaction.options.getRole("role", true);
      const access = interaction.options.getString("access", true);

      const commandExists = client.commands.has(commandName);
      if (!commandExists) {
        return interaction.reply({
          embeds: [errorEmbed(`Command \`/${commandName}\` does not exist.`)],
          ephemeral: true,
        });
      }

      if (access === "reset") {
        permissionDb.remove(interaction.guildId!, commandName, role.id);
        return interaction.reply({
          embeds: [successEmbed("Permission Reset", `Permissions for \`/${commandName}\` with <@&${role.id}> have been reset.`)],
          ephemeral: true,
        });
      }

      permissionDb.set(interaction.guildId!, commandName, role.id, access === "allow");

      const action = access === "allow" ? "✅ Allowed" : "❌ Denied";
      return interaction.reply({
        embeds: [
          successEmbed(
            "Permission Updated",
            `${action} <@&${role.id}> from using \`/${commandName}\`.`
          ),
        ],
        ephemeral: true,
      });
    }

    if (sub === "viewperms") {
      const perms = permissionDb.getAll(interaction.guildId!);

      if (perms.length === 0) {
        return interaction.reply({
          embeds: [
            createEmbed({
              title: `${EMOJIS.SHIELD} Command Permissions`,
              description: "No custom permissions have been configured. All commands use their default Discord permissions.",
              color: COLORS.INFO,
            }),
          ],
        });
      }

      const grouped = new Map<string, typeof perms>();
      for (const perm of perms) {
        if (!grouped.has(perm.command_name)) grouped.set(perm.command_name, []);
        grouped.get(perm.command_name)!.push(perm);
      }

      const fields = [...grouped.entries()].map(([cmd, ps]) => ({
        name: `\`/${cmd}\``,
        value: ps.map(p => `${p.allowed ? "✅" : "❌"} <@&${p.role_id}>`).join("\n"),
        inline: true,
      }));

      return interaction.reply({
        embeds: [
          createEmbed({
            title: `${EMOJIS.SHIELD} Command Permissions`,
            description: `**${perms.length}** permission rule(s) configured`,
            color: COLORS.PRIMARY,
            fields,
          }),
        ],
      });
    }
  },
};
