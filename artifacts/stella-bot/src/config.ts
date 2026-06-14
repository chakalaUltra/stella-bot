export const COLORS = {
  PRIMARY: 0x1a0033,
  SUCCESS: 0x6a0dad,
  ERROR: 0xff4444,
  WARNING: 0xffaa00,
  INFO: 0x9b59b6,
  NEUTRAL: 0x2c0052,
} as const;

export const EMOJIS = {
  STAR: "⭐",
  CHECK: "✅",
  CROSS: "❌",
  WARN: "⚠️",
  BAN: "🔨",
  KICK: "👢",
  MUTE: "🔇",
  LOCK: "🔒",
  UNLOCK: "🔓",
  TICKET: "🎫",
  SETTINGS: "⚙️",
  INFO: "ℹ️",
  PING: "📡",
  SHIELD: "🛡️",
  CROWN: "👑",
  SPARKLE: "✨",
  BELL: "🔔",
  TRASH: "🗑️",
  CLOCK: "⏰",
  PURPLE: "💜",
} as const;

export const BOT_NAME = "Stella";
export const DEFAULT_PREFIX = "s!";
export const BOT_VERSION = "1.0.0";
export const BOT_FOOTER = `${EMOJIS.STAR} Stella • Your cosmic companion`;

export const TICKET_PREFIX = "ticket-";
export const MAX_WARNINGS = 3;

export const TICKET_TOPICS = [
  "General Support",
  "Bug Report",
  "Appeal",
  "Partnership",
  "Other",
] as const;
