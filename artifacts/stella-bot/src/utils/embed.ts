import { EmbedBuilder, type ColorResolvable } from "discord.js";
import { COLORS, BOT_FOOTER, EMOJIS } from "../config.js";

export function createEmbed(options: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: string;
  image?: string;
  footer?: string;
  timestamp?: boolean;
  author?: { name: string; iconURL?: string };
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor((options.color ?? COLORS.PRIMARY) as ColorResolvable)
    .setFooter({ text: options.footer ?? BOT_FOOTER });

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.fields) embed.addFields(options.fields);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.timestamp !== false) embed.setTimestamp();
  if (options.author) embed.setAuthor(options.author);

  return embed;
}

export function successEmbed(title: string, description: string): EmbedBuilder {
  return createEmbed({
    title: `${EMOJIS.CHECK} ${title}`,
    description,
    color: COLORS.SUCCESS,
  });
}

export function errorEmbed(description: string): EmbedBuilder {
  return createEmbed({
    title: `${EMOJIS.CROSS} Error`,
    description,
    color: COLORS.ERROR,
  });
}

export function warnEmbed(title: string, description: string): EmbedBuilder {
  return createEmbed({
    title: `${EMOJIS.WARN} ${title}`,
    description,
    color: COLORS.WARNING,
  });
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return createEmbed({
    title: `${EMOJIS.INFO} ${title}`,
    description,
    color: COLORS.INFO,
  });
}

export function modEmbed(options: {
  action: string;
  emoji: string;
  target: string;
  moderator: string;
  reason: string;
  extra?: { name: string; value: string }[];
}): EmbedBuilder {
  return createEmbed({
    title: `${options.emoji} ${options.action}`,
    color: COLORS.PRIMARY,
    fields: [
      { name: "👤 Target", value: options.target, inline: true },
      { name: `${EMOJIS.SHIELD} Moderator`, value: options.moderator, inline: true },
      { name: "📋 Reason", value: options.reason },
      ...(options.extra ?? []),
    ],
  });
}
