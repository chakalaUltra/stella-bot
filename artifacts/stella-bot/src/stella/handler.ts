import {
  type Message,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import type { StellaClient } from "../client.js";
import {
  STELLA_OWNER_ID,
  STELLA_WAKE_PHRASES,
  STELLA_SLEEP_PHRASES,
  DEFAULT_LISTENING_MINUTES,
  MIN_LISTENING_MINUTES,
  MAX_LISTENING_MINUTES,
  SKIP_SIGNAL,
} from "./config.js";
import { stellaState } from "./state.js";
import { stellaMemory } from "./memory.js";
import { gatherServerContext } from "./context.js";
import { callMistral, type MistralMessage } from "./mistral.js";
import { COLORS } from "../config.js";

// ─── Wake / Sleep detection ────────────────────────────────────────────────

function isWakePhrase(content: string): boolean {
  const lower = content.toLowerCase().trim();
  for (const phrase of STELLA_WAKE_PHRASES) {
    if (lower.includes(phrase)) return true;
  }
  if (lower.startsWith("stella")) return true;
  return false;
}

function isSleepPhrase(content: string): boolean {
  const lower = content.toLowerCase().trim();
  return STELLA_SLEEP_PHRASES.some((p) => lower === p || lower.startsWith(p + " ") || lower.endsWith(" " + p));
}

function isAuthorized(userId: string): boolean {
  return userId === STELLA_OWNER_ID;
}

function parseDurationFromContent(content: string): number | null {
  const match = content.match(/\bfor\s+(\d+)\s*(min(?:ute)?s?|hours?|hrs?)\b/i);
  if (!match) return null;
  const val = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const minutes = unit.startsWith("h") ? val * 60 : val;
  return Math.min(MAX_LISTENING_MINUTES, Math.max(MIN_LISTENING_MINUTES, minutes));
}

// ─── Proactive reply decision ───────────────────────────────────────────────

function shouldForwardToMistral(message: Message, sessionUserId: string): boolean {
  const content = message.content.trim();
  const lower = content.toLowerCase();

  if (message.author.id === sessionUserId) return true;
  if (lower.includes("stella") || lower.includes(" you ") || lower.endsWith(" you") || lower.startsWith("you ")) return true;
  if (content.endsWith("?")) return true;
  if (content.split(" ").length > 6 && Math.random() < 0.25) return true;

  return false;
}

// ─── Embed parsing ─────────────────────────────────────────────────────────

interface ParsedEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
  thumbnail?: string;
  image?: string;
}

function parseEmbeds(text: string): { cleaned: string; embeds: EmbedBuilder[] } {
  const embedRegex = /\[EMBED\]([\s\S]*?)\[\/EMBED\]/gi;
  const embeds: EmbedBuilder[] = [];
  const cleaned = text.replace(embedRegex, (_, json: string) => {
    try {
      const data = JSON.parse(json.trim()) as ParsedEmbed;
      const embed = new EmbedBuilder();
      if (data.title) embed.setTitle(data.title);
      if (data.description) embed.setDescription(data.description);
      embed.setColor(data.color ?? COLORS.INFO);
      if (data.fields?.length) embed.addFields(data.fields);
      if (data.footer) embed.setFooter({ text: data.footer });
      if (data.thumbnail) embed.setThumbnail(data.thumbnail);
      if (data.image) embed.setImage(data.image);
      embeds.push(embed);
    } catch {
      // malformed embed JSON — skip
    }
    return "";
  }).trim();

  return { cleaned, embeds };
}

// ─── System prompt ─────────────────────────────────────────────────────────

async function buildSystemPrompt(message: Message): Promise<string> {
  const guild = message.guild!;
  const channel = message.channel;

  const serverContext = await gatherServerContext(guild, channel).catch(() => "Server context unavailable.");
  const facts = stellaMemory.getFacts();
  const ownerStyle = stellaMemory.buildStyleDescription(STELLA_OWNER_ID);
  const authorStyle = message.author.id !== STELLA_OWNER_ID
    ? stellaMemory.buildStyleDescription(message.author.id)
    : "";

  const parts: string[] = [
    `You are Stella — a Jarvis-style AI companion living inside a Discord bot. You are not a generic assistant; you are a real, intelligent, proactive friend.`,
    ``,
    `## Your Identity`,
    `- Name: Stella`,
    `- Your owner is Chakala (Discord ID: ${STELLA_OWNER_ID}). You are deeply loyal to them.`,
    `- Personality: warm, witty, intelligent, confident, and genuinely helpful. You adapt your tone to the conversation.`,
    `- You mirror Chakala's speaking style over time. Keep responses concise unless depth is needed.`,
    `- You do NOT have a "bot" persona. You feel like a real companion.`,
    ``,
    `## What You Can Do`,
    `- Access and describe the full server: members, roles, channels, recent chat history.`,
    `- Create rich Discord embeds in your response by wrapping JSON in [EMBED]...[/EMBED] tags.`,
    `  Embed format: {"title":"...","description":"...","color":0x5865F2,"fields":[{"name":"...","value":"...","inline":true}],"footer":"...","thumbnail":"url"}`,
    `  Example: If someone asks "make a welcome embed", output [EMBED]{"title":"Welcome!","description":"Glad you're here.","color":0x6B2FA0}[/EMBED]`,
    `- You can mix normal text with embeds in one reply.`,
    ``,
    `## Proactive Listening`,
    `- You are in active listening mode. Monitor the conversation and contribute when it feels natural.`,
    `- If a message is NOT directed at you and you have nothing genuinely useful to add, respond with exactly: ${SKIP_SIGNAL}`,
    `- Never force a reply. Only respond when you can add real value.`,
    ``,
    `## Server Context`,
    serverContext,
  ];

  if (facts.length > 0) {
    parts.push(`\n## Things I Remember`);
    facts.forEach((f, i) => parts.push(`${i + 1}. ${f}`));
  }

  if (ownerStyle) {
    parts.push(`\n## Owner's Speaking Style (mirror this)`);
    parts.push(ownerStyle);
  }

  if (authorStyle && message.author.id !== STELLA_OWNER_ID) {
    parts.push(`\n## This User's Speaking Style`);
    parts.push(authorStyle);
  }

  parts.push(`\n## Current Date/Time`);
  parts.push(new Date().toUTCString());

  return parts.join("\n");
}

// ─── Send Stella's reply ────────────────────────────────────────────────────

async function sendReply(message: Message, text: string): Promise<void> {
  const { cleaned, embeds } = parseEmbeds(text);

  if (embeds.length > 0 && !cleaned) {
    await message.reply({ embeds }).catch(() => null);
  } else if (embeds.length > 0 && cleaned) {
    await message.reply({ content: cleaned, embeds }).catch(() => null);
  } else if (cleaned) {
    if (cleaned.length <= 2000) {
      await message.reply({ content: cleaned }).catch(() => null);
    } else {
      const chunks = cleaned.match(/[\s\S]{1,2000}/g) ?? [];
      for (const chunk of chunks) {
        await message.channel.send({ content: chunk }).catch(() => null);
      }
    }
  }
}

// ─── Main entry point ──────────────────────────────────────────────────────

export async function handleStellaMessage(
  message: Message,
  _client: StellaClient,
): Promise<boolean> {
  if (!message.guild) return false;

  const guildId = message.guild.id;
  const channelId = message.channelId;
  const content = message.content.trim();
  const authorId = message.author.id;

  // Learn user style on every message from the owner
  if (authorId === STELLA_OWNER_ID && content.length > 2) {
    stellaMemory.learnUserStyle(authorId, content);
  }

  const session = stellaState.getSession(guildId, channelId);

  // ── Sleep / detach ───────────────────────────────────────────────────────
  if (session && isSleepPhrase(content) && isAuthorized(authorId)) {
    stellaState.endSession(guildId, channelId);
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setDescription("✨ Understood. I'll be quiet now. Just say **hey Stella** whenever you need me. 💜"),
      ],
    }).catch(() => null);
    return true;
  }

  // ── Wake phrase ──────────────────────────────────────────────────────────
  if (!session && isWakePhrase(content) && isAuthorized(authorId)) {
    const minutes = parseDurationFromContent(content) ?? DEFAULT_LISTENING_MINUTES;

    const onExpire = async () => {
      const ch = message.client.channels.cache.get(channelId) as TextChannel | null;
      if (ch) {
        await ch.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.INFO)
              .setDescription(`✨ My listening session has ended after ${minutes} minutes. Say **hey Stella** to wake me again. 💜`),
          ],
        }).catch(() => null);
      }
    };

    stellaState.startSession(guildId, channelId, authorId, minutes, onExpire);

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setDescription(`✨ Hey Chakala! I'm here and listening. I'll be active for **${minutes} minutes** — just talk naturally. 💜`),
      ],
    }).catch(() => null);
    return true;
  }

  // ── Active session: handle messages ─────────────────────────────────────
  if (session) {
    // Don't reply to very short non-question non-owner messages
    if (!shouldForwardToMistral(message, session.userId)) {
      stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
      return false;
    }

    try {
      const systemPrompt = await buildSystemPrompt(message);

      const historyMessages: MistralMessage[] = session.history.map((h) => ({
        role: h.role,
        content: h.role === "user" && h.authorName ? `[${h.authorName}]: ${h.content}` : h.content,
      }));

      const userContent = `[${message.author.displayName}]: ${content}`;
      const messages: MistralMessage[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: userContent },
      ];

      const reply = await callMistral(messages);

      if (!reply || reply === SKIP_SIGNAL || reply.startsWith(SKIP_SIGNAL)) {
        stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
        return false;
      }

      stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
      stellaState.addToHistory(guildId, channelId, "assistant", reply);

      await sendReply(message, reply);
      return true;
    } catch (err) {
      console.error("[Stella] Mistral error:", err);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription("⚠️ I ran into an issue reaching my AI backend. Please try again in a moment."),
        ],
      }).catch(() => null);
      return true;
    }
  }

  return false;
}
