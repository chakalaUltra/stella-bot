import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  ChannelType,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply, okReply, infoReply, cardReply, CLR } from "../../utils/ui.js";
import { checkPermissions } from "../../utils/permissions.js";
import { guildDb, permissionDb } from "../../database/db.js";

export default {
  category: "Settings",
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Manage server settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName("view").setDescription("View all current server settings"))
    .addSubcommand(s =>
      s.setName("logs")
        .setDescription("Set the moderation log channel")
        .addChannelOption(o =>
          o.setName("channel").setDescription("The log channel (leave empty to disable)")
            .addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
    )
    .addSubcommand(s =>
      s.setName("welcome")
        .setDescription("Configure the welcome message")
        .addChannelOption(o =>
          o.setName("channel").setDescription("Welcome channel (leave empty to disable)")
            .addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
        .addStringOption(o =>
          o.setName("message")
            .setDescription("Welcome message. Use {user}, {username}, {server}, {count}")
            .setRequired(false)
        )
    )
    .addSubcommand(s =>
      s.setName("prefix")
        .setDescription("Change the bot prefix for this server")
        .addStringOption(o =>
          o.setName("prefix").setDescription("New prefix (max 5 chars)").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("permissions")
        .setDescription("Set command permissions for a role")
        .addStringOption(o => o.setName("command").setDescription("Command name (without /)").setRequired(true))
        .addRoleOption(o => o.setName("role").setDescription("The role to configure").setRequired(true))
        .addStringOption(o =>
          o.setName("access").setDescription("Allow or deny access").setRequired(true)
            .addChoices(
              { name: "Allow", value: "allow" },
              { name: "Deny", value: "deny" },
              { name: "Reset", value: "reset" }
            )
        )
    )
    .addSubcommand(s => s.setName("viewperms").setDescription("View all configured command permissions")),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    if (!await checkPermissions(interaction, [PermissionFlagsBits.ManageGuild], "settings")) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "view") {
      const s = guildDb.get(interaction.guildId!);

      return interaction.reply(infoReply({
        title: interaction.guild?.name ?? "Server Settings",
        thumbnail: interaction.guild?.iconURL({ size: 256 }),
        rows: [
          ["Prefix", `\`${s.prefix}\``],
          ["Mod log channel", s.log_channel ? `<#${s.log_channel}>` : "Not set"],
          ["Welcome channel", s.welcome_channel ? `<#${s.welcome_channel}>` : "Not set"],
          ["Welcome message", s.welcome_message ?? "Default"],
          ["Ticket support role", s.ticket_support_role ? `<@&${s.ticket_support_role}>` : "Not set"],
          ["Ticket log channel", s.ticket_log_channel ? `<#${s.ticket_log_channel}>` : "Not set"],
          ["Ticket category", s.ticket_category ? `<#${s.ticket_category}>` : "Not set"],
          ["Total tickets", `${s.ticket_count}`],
        ],
      }));
    }

    if (sub === "logs") {
      const channel = interaction.options.getChannel("channel");
      guildDb.update(interaction.guildId!, { log_channel: channel?.id ?? null });

      return interaction.reply({
        ...okReply(
          channel ? "Log Channel Set" : "Logs Disabled",
          channel ? `Mod logs → <#${channel.id}>` : "Moderation logging has been disabled."
        ),
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
        return interaction.reply({ ...okReply("Welcome Disabled", "Welcome messages have been turned off."), ephemeral: true });
      }

      const preview = (message ?? `Welcome to **{server}**, {user}! You are member #{count}.`)
        .replace("{user}", `<@${interaction.user.id}>`)
        .replace("{username}", interaction.user.username)
        .replace("{server}", interaction.guild!.name)
        .replace("{count}", `${interaction.guild!.memberCount}`);

      return interaction.reply({
        ...okReply("Welcome Updated", `Channel: <#${channel.id}>\nPreview: ${preview}`),
        ephemeral: true,
      });
    }

    if (sub === "prefix") {
      const newPrefix = interaction.options.getString("prefix", true);
      if (newPrefix.length > 5) {
        return interaction.reply({ ...errReply("Prefix must be 5 characters or less."), ephemeral: true });
      }
      guildDb.update(interaction.guildId!, { prefix: newPrefix });
      return interaction.reply({
        ...okReply("Prefix Updated", `New prefix: \`${newPrefix}\`\nExample: \`${newPrefix}help\``),
        ephemeral: true,
      });
    }

    if (sub === "permissions") {
      const commandName = interaction.options.getString("command", true).toLowerCase();
      const role = interaction.options.getRole("role", true);
      const access = interaction.options.getString("access", true);

      if (!client.commands.has(commandName)) {
        return interaction.reply({ ...errReply(`Command \`/${commandName}\` does not exist.`), ephemeral: true });
      }

      if (access === "reset") {
        permissionDb.remove(interaction.guildId!, commandName, role.id);
        return interaction.reply({
          ...okReply("Permission Reset", `Permissions for \`/${commandName}\` → <@&${role.id}> reset to default.`),
          ephemeral: true,
        });
      }

      permissionDb.set(interaction.guildId!, commandName, role.id, access === "allow");

      return interaction.reply({
        ...okReply(
          "Permission Updated",
          `${access === "allow" ? "Allowed" : "Denied"} <@&${role.id}> from using \`/${commandName}\`.`
        ),
        ephemeral: true,
      });
    }

    if (sub === "viewperms") {
      const perms = permissionDb.getAll(interaction.guildId!);

      if (perms.length === 0) {
        return interaction.reply(cardReply(
          "## Command Permissions\nNo custom permissions configured.\nAll commands use their default Discord permissions.",
          CLR.INFO
        ));
      }

      const grouped = new Map<string, typeof perms>();
      for (const perm of perms) {
        if (!grouped.has(perm.command_name)) grouped.set(perm.command_name, []);
        grouped.get(perm.command_name)!.push(perm);
      }

      const lines = [...grouped.entries()]
        .map(([cmd, ps]) => `**/${cmd}**\n${ps.map(p => `${p.allowed ? "✓" : "✗"} <@&${p.role_id}>`).join("\n")}`)
        .join("\n\n");

      return interaction.reply(cardReply(`## Command Permissions\n${lines}`, CLR.PRIMARY));
    }
  },
};
