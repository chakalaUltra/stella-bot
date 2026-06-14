import { type GuildMember, TextChannel, EmbedBuilder } from "discord.js";
import { guildDb } from "../database/db.js";
import { COLORS, BOT_FOOTER, EMOJIS } from "../config.js";

export default {
  name: "guildMemberAdd",
  once: false,
  async execute(member: GuildMember) {
    const settings = guildDb.get(member.guild.id);
    if (!settings.welcome_channel) return;

    const channel = member.guild.channels.cache.get(settings.welcome_channel) as TextChannel | undefined;
    if (!channel) return;

    const message = settings.welcome_message
      ? settings.welcome_message
          .replace("{user}", `<@${member.id}>`)
          .replace("{username}", member.user.username)
          .replace("{server}", member.guild.name)
          .replace("{count}", member.guild.memberCount.toString())
      : `Welcome to **${member.guild.name}**, <@${member.id}>! ${EMOJIS.SPARKLE} You are member #${member.guild.memberCount}.`;

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.STAR} Welcome to ${member.guild.name}!`)
      .setDescription(message)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: BOT_FOOTER })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  },
};
