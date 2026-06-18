import {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  type MessageCreateOptions,
} from "discord.js";
import { searchGif } from "./gif.js";

// Default dark purple to match the bot's existing embed style
export const STELLA_DEFAULT_COLOR = 0x6b2fa0;

// ─── Schema Stella emits ───────────────────────────────────────────────────

export interface StellaEmbedSchema {
  color?: number;
  header?: string;
  subheader?: string;
  thumbnail?: string;
  body?: string;
  fields?: Array<{ name: string; value: string }>;
  buttons?: Array<{
    label: string;
    style?: "primary" | "secondary" | "success" | "danger" | "link";
    url?: string;
    disabled?: boolean;
  }>;
  select?: {
    placeholder?: string;
    options: Array<{ label: string; value: string; description?: string }>;
  };
}

// ─── Robust JSON extractor ─────────────────────────────────────────────────
// Handles Mistral wrapping JSON in ```json ... ``` or other stray text

function extractJson(raw: string): string {
  // Strip markdown code fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1]!.trim();
  // Try to find a raw JSON object
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1).trim();
  }
  return raw.trim();
}

// ─── V2 component builder ──────────────────────────────────────────────────

function buttonStyleFor(style?: string): ButtonStyle {
  switch (style) {
    case "primary":   return ButtonStyle.Primary;
    case "success":   return ButtonStyle.Success;
    case "danger":    return ButtonStyle.Danger;
    case "link":      return ButtonStyle.Link;
    default:          return ButtonStyle.Secondary; // grey by default
  }
}

export function buildV2Message(schema: StellaEmbedSchema): MessageCreateOptions {
  const color = schema.color ?? STELLA_DEFAULT_COLOR;
  const container = new ContainerBuilder().setAccentColor(color);

  // Header + optional thumbnail
  if (schema.header) {
    const headerText = schema.subheader
      ? `## ${schema.header}\n${schema.subheader}`
      : `## ${schema.header}`;

    if (schema.thumbnail) {
      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(schema.thumbnail));
      container.addSectionComponents(section);
    } else {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText));
    }
  }

  // Divider before body/fields if we have a header
  if (schema.header && (schema.body || schema.fields?.length)) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );
  }

  // Body text
  if (schema.body) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(schema.body));
  }

  // Fields as key-value text rows
  if (schema.fields?.length) {
    const fieldText = schema.fields
      .map((f) => `**${f.name}** · ${f.value}`)
      .join("\n");
    if (schema.body) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
      );
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fieldText));
  }

  // ── Action rows (buttons + select) — placed inside the container ─────────

  // Buttons — up to 5 per row
  if (schema.buttons?.length) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    );
    const chunks: typeof schema.buttons[] = [];
    for (let i = 0; i < schema.buttons.length; i += 5) {
      chunks.push(schema.buttons.slice(i, i + 5));
    }
    for (const chunk of chunks) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let i = 0; i < chunk.length; i++) {
        const btn = chunk[i]!;
        const builder = new ButtonBuilder()
          .setLabel(btn.label)
          .setStyle(buttonStyleFor(btn.style));

        if (btn.style === "link" && btn.url) {
          builder.setURL(btn.url);
        } else {
          builder.setCustomId(`stella_btn_${i}_${Date.now()}`);
        }
        if (btn.disabled) builder.setDisabled(true);
        row.addComponents(builder);
      }
      container.addActionRowComponents(row);
    }
  }

  // Select menu — max 25 options, also inside the container
  if (schema.select?.options?.length) {
    if (!schema.buttons?.length) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
      );
    }
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`stella_select_${Date.now()}`)
      .setPlaceholder(schema.select.placeholder ?? "Select an option")
      .addOptions(
        schema.select.options.slice(0, 25).map((o) => {
          const opt = new StringSelectMenuOptionBuilder()
            .setLabel(o.label)
            .setValue(o.value);
          if (o.description) opt.setDescription(o.description);
          return opt;
        }),
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    container.addActionRowComponents(row);
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

// ─── Parse all special tags from a Stella response ─────────────────────────
// Handles: [EMBED]...[/EMBED], bare ```json {...}```, and [GIF:query]

export interface ParseResult {
  textParts: string[];
  messages: MessageCreateOptions[];
}

const EMBED_KEYS: ReadonlySet<string> = new Set([
  "header", "subheader", "body", "fields", "buttons", "select", "thumbnail", "color",
]);

function looksLikeEmbedSchema(obj: unknown): obj is StellaEmbedSchema {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  return Object.keys(obj).some((k) => EMBED_KEYS.has(k));
}

// Group 1 = [EMBED] inner  |  Group 2 = bare code-fence JSON  |  Group 3 = GIF query
function buildCombinedRegex(): RegExp {
  return /\[EMBED\]([\s\S]*?)\[\/EMBED\]|```(?:json)?\s*(\{[\s\S]*?\})\s*```|\[GIF:(.*?)\]/gi;
}

export async function parseStellaResponse(text: string): Promise<ParseResult> {
  const textParts: string[] = [];
  const messages: MessageCreateOptions[] = [];

  const regex = buildCombinedRegex();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) textParts.push(before);

    // ── GIF tag ────────────────────────────────────────────────────────────
    if (match[3] !== undefined) {
      const query = match[3].trim();
      const url = await searchGif(query);
      if (url) {
        // Plain URL message — Discord auto-embeds GIFs inline
        messages.push({ content: url });
      } else {
        // No result or no key — silently omit rather than show a broken message
        console.warn(`[Stella] GIF search returned nothing for: "${query}"`);
      }
      lastIndex = match.index + match[0].length;
      continue;
    }

    // ── Embed / code-fence JSON ────────────────────────────────────────────
    const rawInner = match[1] ?? match[2]!;
    const isBareFence = match[1] === undefined;

    try {
      const json = extractJson(rawInner);
      const parsed = JSON.parse(json) as unknown;

      if (isBareFence && !looksLikeEmbedSchema(parsed)) {
        if (match[0].trim()) textParts.push(match[0].trim());
        lastIndex = match.index + match[0].length;
        continue;
      }

      messages.push(buildV2Message(parsed as StellaEmbedSchema));
    } catch (err) {
      console.error("[Stella] Failed to parse embed JSON:", err, "\nRaw:", rawInner);
      messages.push(
        buildV2Message({
          header: "Embed",
          body: "_Failed to render embed — the AI returned invalid format._",
        }),
      );
    }

    lastIndex = match.index + match[0].length;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) textParts.push(tail);

  return { textParts, messages };
}
