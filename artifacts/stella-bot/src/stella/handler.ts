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
  return STELLA_SLEEP_PHRASES.some(
    (p) => lower === p || lower.startsWith(p + " ") || lower.endsWith(" " + p),
  );
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
  const cleaned = text
    .replace(embedRegex, (_, json: string) => {
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
    })
    .trim();

  return { cleaned, embeds };
}

// ─── System prompt ─────────────────────────────────────────────────────────

async function buildSystemPrompt(message: Message): Promise<string> {
  const guild = message.guild!;
  const channel = message.channel;

  const serverContext = await gatherServerContext(guild, channel).catch(
    () => "Server context unavailable.",
  );
  const facts = stellaMemory.getFacts();
  const ownerStyle = stellaMemory.buildStyleDescription(STELLA_OWNER_ID);
  const authorStyle =
    message.author.id !== STELLA_OWNER_ID
      ? stellaMemory.buildStyleDescription(message.author.id)
      : "";

  const parts: string[] = [
    `You are Stella, a personal AI assistant operating inside a Discord bot.`,
    ``,
    `## Core Rules`,
    `- Never use emojis. Not in any message, ever.`,
    `- No filler phrases. No "Sure!", "Of course!", "Great question!", "Absolutely!" or similar.`,
    `- Be direct, concise, and professional. Answer the question or do the task — nothing more.`,
    `- Do not introduce yourself or mention your name unless explicitly asked.`,
    `- Do not refer to yourself as a bot or AI unless directly asked.`,
    `- Tone: calm, competent, formal. Think assistant to a busy person — clear and efficient.`,
    `- Short answers for short questions. Longer answers only when depth is genuinely needed.`,
    ``,
    `## Your Owner`,
    `- Your owner is Chakala (Discord ID: ${STELLA_OWNER_ID}). You serve them first.`,
    `- Learn their vocabulary, tone, and communication style over time and mirror it.`,
    ``,
    `## Capabilities`,
    `- You have full visibility into the server: members, roles, channels, recent chat history.`,
    `- To create a Discord embed, wrap embed JSON in [EMBED]...[/EMBED] tags.`,
    `  Format: {"title":"...","description":"...","color":0x5865F2,"fields":[{"name":"...","value":"...","inline":true}],"footer":"...","thumbnail":"url"}`,
    `  You may mix plain text with embed tags in one response.`,
    ``,
    `## Proactive Listening`,
    `- You are in active listening mode in this channel.`,
    `- Only respond if the message is directed at you, asks a question, or you have something genuinely useful to add.`,
    `- If the message is not meant for you or you have nothing to add, respond with exactly: ${SKIP_SIGNAL}`,
    ``,
    `## Server Context`,
    serverContext,
  ];

  if (facts.length > 0) {
    parts.push(`\n## Remembered Facts`);
    facts.forEach((f, i) => parts.push(`${i + 1}. ${f}`));
  }

  if (ownerStyle) {
    parts.push(`\n## Owner's Communication Style`);
    parts.push(ownerStyle);
  }

  if (authorStyle && message.author.id !== STELLA_OWNER_ID) {
    parts.push(`\n## This User's Communication Style`);
    parts.push(authorStyle);
  }

  parts.push(`\n## Current Time`);
  parts.push(new Date().toUTCString());

  return parts.join("\n");
}

// ─── Send Stella's message ─────────────────────────────────────────────────

async function sendMessage(message: Message, text: string): Promise<void> {
  const { cleaned, embeds } = parseEmbeds(text);
  const channel = message.channel;

  if (embeds.length > 0 && !cleaned) {
    await channel.send({ embeds }).catch(() => null);
  } else if (embeds.length > 0 && cleaned) {
    await channel.send({ content: cleaned, embeds }).catch(() => null);
  } else if (cleaned) {
    if (cleaned.length <= 2000) {
      await channel.send({ content: cleaned }).catch(() => null);
    } else {
      const chunks = cleaned.match(/[\s\S]{1,2000}/g) ?? [];
      for (const chunk of chunks) {
        await channel.send({ content: chunk }).catch(() => null);
      }
    }
  }
}

// ─── Mistral call helper ───────────────────────────────────────────────────

async function getAIResponse(message: Message, session: { history: Array<{ role: "user" | "assistant"; content: string; authorId?: string; authorName?: string }> }): Promise<string> {
  const systemPrompt = await buildSystemPrompt(message);

  const historyMessages: MistralMessage[] = session.history.map((h) => ({
    role: h.role,
    content:
      h.role === "user" && h.authorName
        ? `[${h.authorName}]: ${h.content}`
        : h.content,
  }));

  const userContent = `[${message.author.displayName}]: ${message.content.trim()}`;
  const messages: MistralMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: userContent },
  ];

  return callMistral(messages);
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

  // Always learn owner's style
  if (authorId === STELLA_OWNER_ID && content.length > 2) {
    stellaMemory.learnUserStyle(authorId, content);
  }

  const session = stellaState.getSession(guildId, channelId);

  // ── Sleep / detach ───────────────────────────────────────────────────────
  if (session && isSleepPhrase(content) && isAuthorized(authorId)) {
    stellaState.endSession(guildId, channelId);
    await message.channel.send({ content: "Understood." }).catch(() => null);
    return true;
  }

  // ── Wake phrase ──────────────────────────────────────────────────────────
  if (!session && isWakePhrase(content) && isAuthorized(authorId)) {
    const minutes = parseDurationFromContent(content) ?? DEFAULT_LISTENING_MINUTES;

    const onExpire = async () => {
      const ch = message.client.channels.cache.get(channelId) as TextChannel | null;
      if (ch) {
        await ch.send({ content: "Listening session ended." }).catch(() => null);
      }
    };

    stellaState.startSession(guildId, channelId, authorId, minutes, onExpire);

    // Treat the wake message as the first message and respond naturally
    try {
      const newSession = stellaState.getSession(guildId, channelId)!;
      const reply = await getAIResponse(message, newSession);

      if (reply && reply !== SKIP_SIGNAL && !reply.startsWith(SKIP_SIGNAL)) {
        stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
        stellaState.addToHistory(guildId, channelId, "assistant", reply);
        await sendMessage(message, reply);
      }
    } catch (err) {
      console.error("[Stella] Mistral error on wake:", err);
    }

    return true;
  }

  // ── Active session: handle messages ─────────────────────────────────────
  if (session) {
    if (!shouldForwardToMistral(message, session.userId)) {
      stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
      return false;
    }

    try {
      const reply = await getAIResponse(message, session);

      if (!reply || reply === SKIP_SIGNAL || reply.startsWith(SKIP_SIGNAL)) {
        stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
        return false;
      }

      stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
      stellaState.addToHistory(guildId, channelId, "assistant", reply);
      await sendMessage(message, reply);
      return true;
    } catch (err) {
      console.error("[Stella] Mistral error:", err);
      await message.channel
        .send({ content: "Something went wrong on my end. Try again." })
        .catch(() => null);
      return true;
    }
  }

  return false;
}
