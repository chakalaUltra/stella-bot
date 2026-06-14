import { type Message, EmbedBuilder } from "discord.js";
import type { StellaClient } from "../client.js";
import { guildDb } from "../database/db.js";
import { COLORS, BOT_FOOTER, DEFAULT_PREFIX } from "../config.js";

export default {
  name: "messageCreate",
  once: false,
  async execute(message: Message, client: StellaClient) {
    if (message.author.bot || !message.guild) return;

    const settings = guildDb.get(message.guild.id);
    const prefix = settings.prefix ?? DEFAULT_PREFIX;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = client.prefixCommands.get(commandName);
    if (!command) return;

    const now = Date.now();
    const { cooldowns } = client;
    const cooldownKey = `prefix_${command.name}`;
    if (!cooldowns.has(cooldownKey)) cooldowns.set(cooldownKey, new (await import("discord.js")).Collection());

    const timestamps = cooldowns.get(cooldownKey)!;
    const cooldownAmount = (command.cooldown ?? 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expireTime = timestamps.get(message.author.id)! + cooldownAmount;
      if (now < expireTime) {
        const timeLeft = ((expireTime - now) / 1000).toFixed(1);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setDescription(`❌ Please wait **${timeLeft}s** before using \`${prefix}${command.name}\` again.`)
              .setFooter({ text: BOT_FOOTER }),
          ],
        });
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(`[PrefixCommand Error] ${command.name}:`, err);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription("❌ An error occurred while running that command.")
            .setFooter({ text: BOT_FOOTER }),
        ],
      }).catch(() => null);
    }
  },
};
