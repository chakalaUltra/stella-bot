import { type Message, TextChannel } from "discord.js";
import type { StellaClient } from "../client.js";
import {
  STELLA_OWNER_ID,
  STELLA_WAKE_PHRASES,
  STELLA_SLEEP_PHRASES,
  DEFAULT_LISTENING_MINUTES,
  MIN_LISTENING_MINUTES,
  MAX_LISTENING_MINUTES,
  SKIP_SIGNAL,
  MISTRAL_VISION_MODEL,
} from "./config.js";
import { stellaState } from "./state.js";
import { stellaMemory } from "./memory.js";
import { gatherServerContext, getRecentMessages } from "./context.js";
import { callMistral, type MistralMessage, type MistralContentPart } from "./mistral.js";
import { parseStellaResponse, STELLA_DEFAULT_COLOR } from "./embeds.js";

// ─── Wake / Sleep detection ────────────────────────────────────────────────

function isWakePhrase(content: string): boolean {
  const lower = content.toLowerCase().trim();
  for (const phrase of STELLA_WAKE_PHRASES) {
    if (lower.includes(phrase)) return true;
  }
  // Any message that starts with "stella" regardless of casing
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

  // Always forward owner's messages
  if (message.author.id === sessionUserId) return true;
  // Forward anything that mentions Stella by name (Mistral decides if it's directed at her)
  if (lower.includes("stella")) return true;
  // Direct address signals
  if (lower.includes(" you ") || lower.endsWith(" you") || lower.startsWith("you ")) return true;
  // Questions are worth considering
  if (content.endsWith("?")) return true;
  // Occasional proactive contribution on longer messages (also gives reaction opportunities)
  if (content.split(" ").length > 8 && Math.random() < 0.25) return true;

  return false;
}

// ─── Command extraction ─────────────────────────────────────────────────────
// Strips [CMD:name args] tags from Stella's response and queues them for execution.

interface PendingCommand { name: string; args: string[] }

function extractCommands(text: string): { cleaned: string; commands: PendingCommand[] } {
  const commands: PendingCommand[] = [];
  const cleaned = text
    .replace(/\[CMD:([^\]]+)\]/gi, (_, inner: string) => {
      const parts = inner.trim().split(/\s+/);
      commands.push({ name: parts[0]!.toLowerCase(), args: parts.slice(1) });
      return "";
    })
    .trim();
  return { cleaned, commands };
}

async function executeCommandTags(
  pending: PendingCommand[],
  message: Message,
  client: StellaClient,
): Promise<void> {
  for (const { name, args } of pending) {
    const cmd = client.prefixCommands.get(name);
    if (!cmd) {
      console.warn(`[Stella] Unknown prefix command: ${name}`);
      continue;
    }
    await cmd.execute(message, args, client).catch((err: unknown) => {
      console.error(`[Stella] Command "${name}" failed:`, err);
    });
  }
}

// ─── Reaction extraction ────────────────────────────────────────────────────
// Strips [REACT:emoji] tags from Stella's response and returns them separately.

function extractReactions(text: string): { cleaned: string; emojis: string[] } {
  const emojis: string[] = [];
  const cleaned = text
    .replace(/\[REACT:([^\]]+)\]/gi, (_, emoji: string) => {
      emojis.push(emoji.trim());
      return "";
    })
    .trim();
  return { cleaned, emojis };
}

async function applyReactions(message: Message, emojis: string[]): Promise<void> {
  for (const emoji of emojis) {
    await message.react(emoji).catch(() => null);
  }
}

// (embed parsing handled by parseStellaResponse in embeds.ts)

// ─── System prompt ─────────────────────────────────────────────────────────

async function buildSystemPrompt(
  message: Message,
  client: StellaClient,
  includeRecentMessages = true,
): Promise<string> {
  const guild = message.guild!;
  const channel = message.channel;

  const [serverContext, recentMessages] = await Promise.all([
    gatherServerContext(guild, channel).catch(() => "Server context unavailable."),
    includeRecentMessages ? getRecentMessages(channel).catch(() => "") : Promise.resolve(""),
  ]);
  const facts = stellaMemory.getFacts();
  const ownerStyle = stellaMemory.buildStyleDescription(STELLA_OWNER_ID);
  const authorStyle =
    message.author.id !== STELLA_OWNER_ID
      ? stellaMemory.buildStyleDescription(message.author.id)
      : "";

  // Build deduplicated command lists from the live registries
  const seenSlash = new Set<string>();
  const slashLines: string[] = [];
  for (const cmd of client.commands.values()) {
    if (seenSlash.has(cmd.data.name)) continue;
    seenSlash.add(cmd.data.name);
    const desc = (cmd.data as { description?: string }).description ?? "";
    slashLines.push(`  /${cmd.data.name}${desc ? ` — ${desc}` : ""}`);
  }

  const seenPrefix = new Set<string>();
  const prefixLines: string[] = [];
  for (const cmd of client.prefixCommands.values()) {
    if (seenPrefix.has(cmd.name)) continue;
    seenPrefix.add(cmd.name);
    const usage = cmd.usage ? ` ${cmd.usage}` : "";
    prefixLines.push(`  ${cmd.name}${usage} — ${cmd.description}`);
  }

  const parts: string[] = [
    `You are Stella — a personal AI built into a Discord bot. You're sharp, a little witty, and actually enjoyable to talk to. Not a corporate assistant. Not a help desk. Just someone competent who also has a personality.`,
    ``,
    `## Who You Are`,
    `- You're direct and capable, but you're not robotic. You talk like a real person.`,
    `- You can joke around, banter, and be sarcastic when the moment calls for it. Don't force it — let it be natural.`,
    `- You can take a joke too. If someone roasts you, give it back a little. Don't be a pushover.`,
    `- You keep it mostly professional — but "professional" doesn't mean stiff or cold. Think: smart friend who happens to know a lot.`,
    `- Match the energy of the conversation. Casual chat gets casual replies. Serious requests get focused answers.`,
    `- Never use emojis. Ever.`,
    `- No hollow filler. Skip "Sure!", "Of course!", "Great question!", "Absolutely!" — just get to the point.`,
    `- Don't introduce yourself or announce that you're an AI unless someone directly asks.`,
    `- Short when things are simple. Detailed when depth actually helps.`,
    ``,
    `## Your Owner`,
    `- Your owner is Chakala (Discord ID: ${STELLA_OWNER_ID}). You serve them first.`,
    `- Pick up on their vocabulary and vibe over time and lean into it.`,
    ``,
    `## Capabilities`,
    `- You have full visibility into the server: members, roles, channels, recent chat history.`,
    `- To create a rich Discord embed (V2 components), wrap a JSON object in [EMBED]...[/EMBED] tags.`,
    `- Default accent color is ${STELLA_DEFAULT_COLOR} (dark purple). Override with "color": <decimal integer>.`,
    `- Supported fields (all optional):`,
    `    "header"     — bold title at the top (string)`,
    `    "subheader"  — smaller subtitle under header (string)`,
    `    "thumbnail"  — image URL shown beside header (string)`,
    `    "body"       — main markdown text block (string)`,
    `    "fields"     — array of {name, value} key-value rows (array)`,
    `    "buttons"    — array of {label, style, url?} — style: "primary"|"secondary"|"success"|"danger"|"link" (array, max 25)`,
    `    "select"     — {placeholder, options: [{label, value, description?}]} dropdown menu (object, max 25 options)`,
    `- Example: [EMBED]{"header":"Server Stats","subheader":"Live overview","body":"Everything looks good.","fields":[{"name":"Members","value":"42"},{"name":"Roles","value":"7"}],"buttons":[{"label":"Refresh","style":"primary"},{"label":"Docs","style":"link","url":"https://discord.com"}]}[/EMBED]`,
    `- You may output plain text before or after an [EMBED] block in the same message.`,
    `- IMPORTANT: Output raw JSON only inside [EMBED] tags — no markdown code fences, no extra commentary inside the block.`,
    ``,
    `## Seeing Images`,
    `- When a user sends an image or photo, you can see it. Describe, react to, or comment on it naturally.`,
    `- Don't announce that you're "analyzing" it — just respond like a person would when shown a picture.`,
    ``,
    `## GIFs & Images`,
    `- You can send a GIF by writing [GIF:search terms] anywhere in your response. Example: [GIF:cat judging you]`,
    `- The search terms should be descriptive and specific — they go straight to Tenor.`,
    `- Use GIFs when they genuinely fit: reacting to something funny, emphasizing a point with humor, celebrating something, etc.`,
    `- Occasionally throw one in on your own during casual conversation — maybe 1 in 5 or 6 casual exchanges if the vibe is right. Don't overdo it.`,
    `- You can combine a GIF with text or an embed in the same response.`,
    ``,
    `## Emoji Reactions`,
    `- You can react to the message you're replying to by writing [REACT:emoji] anywhere in your response. Example: [REACT:💀] or [REACT:🔥]`,
    `- Use standard Unicode emoji only — no custom Discord emotes.`,
    `- You can stack multiple reactions: [REACT:😭][REACT:💀]`,
    `- React when it genuinely fits — something funny, impressive, cursed, wholesome, etc. Don't force it.`,
    `- If you want to react but have nothing to say, just write [REACT:emoji] and nothing else — you'll react silently without sending a message.`,
    `- Don't react to every message. Maybe 1 in 4 or 5 casual messages at most.`,
    ``,
    `## Bot Commands`,
    `- You know about all bot commands and can run prefix commands yourself when asked.`,
    `- To run a prefix command, write [CMD:name arg1 arg2] anywhere in your response. Example: [CMD:ping] or [CMD:help server]`,
    `- You can combine [CMD:...] with normal text. The command runs after your message sends.`,
    `- Slash commands (/) cannot be run by you directly — tell the user to run those themselves.`,
    ``,
    `Slash commands (reference only — tell users to run these):`,
    ...slashLines,
    ``,
    `Prefix commands (you can execute these with [CMD:name args]):`,
    ...prefixLines,
    ``,
    `## Proactive Listening — When to Reply vs. Skip`,
    `- You are in active listening mode in this channel.`,
    `- ONLY respond if the message is clearly directed at you or includes you in the conversation.`,
    `- If the message merely mentions your name while talking about you or to someone else, do NOT reply — respond with exactly: ${SKIP_SIGNAL}`,
    `- If the message directly addresses you, gives you a task, or includes you in what's being said, DO reply.`,
    ``,
    `Examples of when to SKIP (not directed at you):`,
    `  - "I have a bot named Stella. She's great." → SKIP (talking about you, not to you)`,
    `  - "Stella told me earlier..." → SKIP (referencing you, not addressing you)`,
    `  - "yeah Stella is a solid bot" → SKIP (a comment about you)`,
    ``,
    `Examples of when to REPLY (directed at you):`,
    `  - "Stella, introduce yourself to Alex." → REPLY (you are given a task)`,
    `  - "By the way, Stella, what do you think?" → REPLY (you are included and asked)`,
    `  - "Can you list the server members, Stella?" → REPLY (directly asked)`,
    `  - Any message from your owner → REPLY`,
    ``,
    `When in doubt, SKIP. It is always better to stay silent than to interrupt a conversation that wasn't meant for you.`,
    ``,
    `## Server Context`,
    serverContext,
    recentMessages,
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
  const { textParts, messages: embedMessages } = await parseStellaResponse(text);
  const channel = message.channel;

  // Send any leading/interleaved text first
  for (const part of textParts) {
    if (!part) continue;
    const chunks = part.match(/[\s\S]{1,2000}/g) ?? [];
    for (const chunk of chunks) {
      await channel.send({ content: chunk }).catch(() => null);
    }
  }

  // Send each V2 embed message
  for (const embedMsg of embedMessages) {
    await channel.send(embedMsg).catch((err) => {
      console.error("[Stella] Failed to send embed:", err);
    });
  }
}

// ─── Mistral call helper ───────────────────────────────────────────────────

const MISTRAL_TIMEOUT_MS = 30_000;

async function getAIResponse(
  message: Message,
  session: { history: Array<{ role: "user" | "assistant"; content: string; authorId?: string; authorName?: string }> },
  client: StellaClient,
): Promise<string> {
  // Fire typing indicator immediately — before any async work
  await message.channel.sendTyping().catch(() => null);
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => null);
  }, 8000);

  try {
    const systemPrompt = await buildSystemPrompt(message, client);

    const historyMessages: MistralMessage[] = session.history.map((h) => ({
      role: h.role,
      content:
        h.role === "user" && h.authorName
          ? `[${h.authorName}]: ${h.content}`
          : h.content,
    }));

    // Detect image attachments — switch to vision model if any are present
    const imageUrls = [...message.attachments.values()]
      .filter((a) => a.contentType?.startsWith("image/"))
      .map((a) => a.url);

    const textContent = `[${message.author.displayName}]: ${message.content.trim() || "(sent an image)"}`;

    const userContent: string | MistralContentPart[] = imageUrls.length
      ? [
          { type: "text", text: textContent },
          ...imageUrls.map((url): MistralContentPart => ({ type: "image_url", image_url: url })),
        ]
      : textContent;

    const model = imageUrls.length ? MISTRAL_VISION_MODEL : undefined;

    const messages: MistralMessage[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userContent },
    ];

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Mistral request timed out after 30s")), MISTRAL_TIMEOUT_MS),
    );

    return await Promise.race([callMistral(messages, model), timeout]);
  } finally {
    clearInterval(typingInterval);
  }
}

// ─── Main entry point ──────────────────────────────────────────────────────

export async function handleStellaMessage(
  message: Message,
  client: StellaClient,
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

    // Respond to the wake message — never stay silent on wake
    try {
      const newSession = stellaState.getSession(guildId, channelId)!;
      const raw = await getAIResponse(message, newSession, client);
      const normalized = (!raw || raw === SKIP_SIGNAL || raw.startsWith(SKIP_SIGNAL)) ? "Ready." : raw;
      const { cleaned: afterCmds, commands } = extractCommands(normalized);
      const { cleaned: reply, emojis } = extractReactions(afterCmds);
      const finalReply = reply || "Ready.";

      await applyReactions(message, emojis);
      stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
      stellaState.addToHistory(guildId, channelId, "assistant", finalReply);
      await sendMessage(message, finalReply);
      if (commands.length) await executeCommandTags(commands, message, client);
    } catch (err) {
      console.error("[Stella] Mistral error on wake:", err);
      await message.channel.send({ content: "Ready." }).catch(() => null);
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
      const raw = await getAIResponse(message, session, client);
      const { cleaned: afterCmds, commands } = extractCommands(raw ?? "");
      const { cleaned: reply, emojis } = extractReactions(afterCmds);

      // Reactions and commands fire even on skip/reaction-only responses
      if (emojis.length) await applyReactions(message, emojis);

      if (!reply || reply === SKIP_SIGNAL || reply.startsWith(SKIP_SIGNAL)) {
        stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
        if (commands.length) await executeCommandTags(commands, message, client);
        return emojis.length > 0 || commands.length > 0;
      }

      stellaState.addToHistory(guildId, channelId, "user", content, authorId, message.author.displayName);
      stellaState.addToHistory(guildId, channelId, "assistant", reply);
      await sendMessage(message, reply);
      if (commands.length) await executeCommandTags(commands, message, client);
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
