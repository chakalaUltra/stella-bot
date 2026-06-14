import {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ThumbnailBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  ActionRowBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js";

export const CLR = {
  PRIMARY: 0x6B2FA0,
  SUCCESS: 0x23A55A,
  ERROR: 0xED4245,
  WARNING: 0xF0B232,
  INFO: 0x5865F2,
} as const;

type AnyChild = TextDisplayBuilder | SeparatorBuilder | SectionBuilder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type V2Components = any[];

export type V2Reply = {
  components: V2Components;
  flags: number;
  ephemeral?: boolean;
};

// ─── Low-level builders ────────────────────────────────────────────────────

export function td(content: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(content);
}

export function divider(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

export function spacer(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);
}

export function sect(content: string, thumbnailUrl?: string | null): SectionBuilder {
  const s = new SectionBuilder().addTextDisplayComponents(td(content));
  if (thumbnailUrl) s.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
  return s;
}

export function box(color: number, children: AnyChild[]): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(color);
  for (const child of children) {
    if (child instanceof SectionBuilder) c.addSectionComponents(child);
    else if (child instanceof SeparatorBuilder) c.addSeparatorComponents(child);
    else c.addTextDisplayComponents(child as TextDisplayBuilder);
  }
  return c;
}

// ─── High-level reply helpers ──────────────────────────────────────────────

/** Red container with a single line. Use for validation errors (ephemeral: true by default). */
export function errReply(message: string): V2Reply {
  return {
    components: [box(CLR.ERROR, [td(message)])],
    flags: MessageFlags.IsComponentsV2,
  };
}

/** Green container with title + body text. Use for successful operations. */
export function okReply(title: string, body: string): V2Reply {
  return {
    components: [box(CLR.SUCCESS, [td(`## ${title}\n${body}`)])],
    flags: MessageFlags.IsComponentsV2,
  };
}

/** Purple container with just a text block. Use for info/fun commands. */
export function cardReply(content: string, color: number = CLR.PRIMARY): V2Reply {
  return {
    components: [box(color, [td(content)])],
    flags: MessageFlags.IsComponentsV2,
  };
}

/**
 * Green container with a section header (title + subtitle) + thumbnail + key-value details.
 * Use for moderation actions (ban, kick, warn, etc.).
 */
export function modReply(options: {
  action: string;
  targetTag: string;
  targetId: string;
  targetAvatar?: string | null;
  moderatorId: string;
  reason: string;
  extra?: [string, string][];
  color?: number;
}): V2Reply {
  const { action, targetTag, targetId, targetAvatar, moderatorId, reason, extra, color = CLR.SUCCESS } = options;

  const details = [
    `**Target** · ${targetTag}`,
    `**User ID** · \`${targetId}\``,
    `**Moderator** · <@${moderatorId}>`,
    `**Reason** · ${reason}`,
    ...(extra?.map(([k, v]) => `**${k}** · ${v}`) ?? []),
  ].join("\n");

  return {
    components: [
      box(color, [
        sect(`## ${action}\n-# Action logged`, targetAvatar),
        divider(),
        td(details),
      ]),
    ],
    flags: MessageFlags.IsComponentsV2,
  };
}

/**
 * Purple container with a header section (title + subtitle + thumbnail) and key-value rows.
 * Use for info commands (userinfo, serverinfo, botinfo).
 */
export function infoReply(options: {
  title: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  rows: [string, string][];
  color?: number;
}): V2Reply {
  const { title, subtitle, thumbnail, rows, color = CLR.PRIMARY } = options;
  const headerText = subtitle ? `## ${title}\n${subtitle}` : `## ${title}`;
  const body = rows.map(([k, v]) => `**${k}** · ${v}`).join("\n");

  return {
    components: [
      box(color, [
        sect(headerText, thumbnail),
        divider(),
        td(body),
      ]),
    ],
    flags: MessageFlags.IsComponentsV2,
  };
}

/**
 * A card with extra interactive rows (ActionRows) alongside.
 * The container is the first component; action rows follow.
 */
export function cardWithRows(
  content: string | AnyChild[],
  rows: ActionRowBuilder<MessageActionRowComponentBuilder>[],
  color: number = CLR.PRIMARY,
): V2Reply {
  const children: AnyChild[] = typeof content === "string" ? [td(content)] : content;
  return {
    components: [box(color, children), ...rows],
    flags: MessageFlags.IsComponentsV2,
  };
}
