import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, okReply, CLR } from "../../utils/ui.js";
import { afkStore } from "../../state/afk.js";

export default {
  category: "Utility",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status — bot will notify others when they ping you")
    .addStringOption(o =>
      o.setName("reason").setDescription("AFK reason (optional)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const reason = interaction.options.getString("reason") ?? "AFK";

    if (afkStore.has(interaction.user.id)) {
      return interaction.reply({
        ...cardReply(`## Already AFK\nYou're already AFK. Send any message to remove your status.`, CLR.WARNING),
        ephemeral: true,
      });
    }

    afkStore.set(interaction.user.id, { reason, since: Date.now() });

    return interaction.reply(
      okReply("AFK Set", `You're now AFK: **${reason}**\nI'll let others know when they ping you.`)
    );
  },
};
