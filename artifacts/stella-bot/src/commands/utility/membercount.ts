import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { infoReply } from "../../utils/ui.js";

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Show the server member count breakdown"),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const guild = interaction.guild!;
    await guild.members.fetch();

    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;
    const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
    const idle = guild.members.cache.filter(m => m.presence?.status === "idle").size;
    const dnd = guild.members.cache.filter(m => m.presence?.status === "dnd").size;
    const offline = total - online - idle - dnd;

    return interaction.reply(infoReply({
      title: guild.name,
      subtitle: `${total.toLocaleString()} members`,
      thumbnail: guild.iconURL({ size: 256 }),
      rows: [
        ["Humans", humans.toLocaleString()],
        ["Bots", bots.toLocaleString()],
        ["Online", `${online}`],
        ["Idle", `${idle}`],
        ["DND", `${dnd}`],
        ["Offline", `${offline}`],
      ],
    }));
  },
};
