import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import type { StellaClient } from "../../client.js";
import { CLR } from "../../utils/ui.js";
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
    const member = interaction.member as GuildMember;

    if (afkStore.has(interaction.user.id)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(CLR.PRIMARY)
            .setDescription("You're already AFK. Send any message to remove your status."),
        ],
        ephemeral: true,
      });
    }

    const originalNickname = member.nickname ?? null;
    const displayName = member.displayName;
    const afkNick = `AFK // ${displayName}`.slice(0, 32);

    afkStore.set(interaction.user.id, { reason, since: Date.now(), originalNickname });

    await member.setNickname(afkNick).catch(() => null);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(CLR.PRIMARY)
          .setDescription(`💤 You're now AFK — **${reason}**`),
      ],
    });
  },
};
