import { type Message, EmbedBuilder, TextChannel, GuildMember } from "discord.js";
import type { StellaClient } from "../client.js";
import { guildDb } from "../database/db.js";
import { COLORS, BOT_FOOTER, DEFAULT_PREFIX } from "../config.js";
import { CLR } from "../utils/ui.js";
import { afkStore } from "../state/afk.js";
import { stickyStore } from "../state/sticky.js";
import { handleStellaMessage } from "../stella/handler.js";

export default {
  name: "messageCreate",
  once: false,
  async execute(message: Message, client: StellaClient) {
    if (message.author.bot || !message.guild) return;

    // ── Stella AI: handle wake/sleep/listening before anything else ───────────
    const stellaHandled = await handleStellaMessage(message, client);
    if (stellaHandled) return;

    // ── AFK: remove status when AFK user sends a message ─────────────────────
    if (afkStore.has(message.author.id)) {
      const entry = afkStore.get(message.author.id)!;
      afkStore.delete(message.author.id);

      const member = message.member as GuildMember;
      await member.setNickname(entry.originalNickname).catch(() => null);

      const notice = await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(CLR.PRIMARY as number)
            .setDescription(`👋 Welcome back, **${member.displayName}**! AFK status removed.`),
        ],
      });
      setTimeout(() => notice.delete().catch(() => null), 5000);
    }

    // ── AFK: notify if a mentioned user is AFK ────────────────────────────────
    for (const [, user] of message.mentions.users) {
      const entry = afkStore.get(user.id);
      if (!entry || user.id === message.author.id) continue;

      const elapsed = Math.floor((Date.now() - entry.since) / 1000);
      const timeStr =
        elapsed < 60 ? `${elapsed}s ago` :
        elapsed < 3600 ? `${Math.floor(elapsed / 60)}m ago` :
        `${Math.floor(elapsed / 3600)}h ago`;

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(CLR.PRIMARY as number)
            .setDescription(`💤 **${user.displayName}** is AFK — ${entry.reason} *(${timeStr})*`),
        ],
      }).catch(() => null);
    }

    // ── Sticky: re-post sticky message after any new message ─────────────────
    const sticky = stickyStore.get(message.channelId);
    if (sticky) {
      const ch = message.channel as TextChannel;
      if (sticky.messageId) {
        await ch.messages.delete(sticky.messageId).catch(() => null);
      }
      const sent = await ch.send(`📌 **Sticky:** ${sticky.content}`).catch(() => null);
      if (sent) sticky.messageId = sent.id;
    }

    // ── Prefix commands ───────────────────────────────────────────────────────
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
