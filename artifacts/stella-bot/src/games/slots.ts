import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  ComponentType,
  SeparatorSpacingSize,
} from "discord.js";
import { CLR, type V2Reply } from "../utils/ui.js";

// ── Currency ─────────────────────────────────────────────────────────────────
// Stored as integer cents to avoid float precision issues.
// 100 cents = 1.00 SC

export const START_BALANCE = 1000; // 10.00 SC

export const BETS = [20, 50, 100, 200, 500, 1000] as const;
export type BetValue = (typeof BETS)[number];

export function formatSC(cents: number): string {
  return `${(cents / 100).toFixed(2)} SC`;
}

// ── Game state ────────────────────────────────────────────────────────────────

export interface SlotsGame {
  userId: string;
  balance: number;
  bet: BetValue;
  ended: boolean;
}

export const activeGames = new Map<string, SlotsGame>();

// ── Symbols ───────────────────────────────────────────────────────────────────

export const SYMBOLS = ["7️⃣", "💎", "🌟", "🍒", "🍋", "🍊"] as const;
type Sym = (typeof SYMBOLS)[number];
export type SlotRow = [Sym, Sym, Sym, Sym, Sym];
export type SlotGrid = [SlotRow, SlotRow, SlotRow];

function randSym(): Sym {
  const weights = [8, 10, 15, 25, 22, 20];
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.floor(Math.random() * total);
  for (let i = 0; i < SYMBOLS.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return SYMBOLS[i]!;
  }
  return SYMBOLS[SYMBOLS.length - 1]!;
}

function randRow(): SlotRow {
  return [randSym(), randSym(), randSym(), randSym(), randSym()];
}

export function spinGrid(): SlotGrid {
  return [randRow(), randRow(), randRow()];
}

// ── Win evaluation (payline = middle row, left-to-right consecutive) ──────────

export function calcResult(
  payline: SlotRow,
  bet: number,
): { payout: number; label: string } {
  const [a, b, c, d, e] = payline;

  if (a === b && b === c && c === d && d === e) {
    if (a === "7️⃣") return { payout: bet * 25, label: "**Jackpot!** Five 7s  ×25" };
    if (a === "💎") return { payout: bet * 20, label: "**Five Diamonds!**  ×20" };
    return { payout: bet * 15, label: "**Five of a Kind**  ×15" };
  }
  if (a === b && b === c && c === d) {
    if (a === "7️⃣") return { payout: bet * 12, label: "**Four 7s**  ×12" };
    return { payout: bet * 8, label: "**Four of a Kind**  ×8" };
  }
  if (a === b && b === c) {
    if (a === "7️⃣") return { payout: bet * 6, label: "**Three 7s**  ×6" };
    return { payout: bet * 3, label: "**Three of a Kind**  ×3" };
  }
  if (a === b) {
    if (a === "7️⃣") return { payout: bet * 2, label: "**Pair of 7s**  ×2" };
    return { payout: bet, label: "**Pair** — bet returned" };
  }
  return { payout: 0, label: "No match" };
}

// ── Render ────────────────────────────────────────────────────────────────────

const IDLE_SYM = "⬜";
const SPIN_SYM = "🌀";

function renderGrid(grid: SlotGrid | null, spinning = false): string {
  const sym = spinning ? SPIN_SYM : IDLE_SYM;
  if (!grid || spinning) {
    const blank = `${sym}  ${sym}  ${sym}  ${sym}  ${sym}`;
    return [`  ${blank}`, `▸ ${blank} ◂`, `  ${blank}`].join("\n");
  }
  return [
    `  ${grid[0].join("  ")}`,
    `▸ ${grid[1].join("  ")} ◂`,
    `  ${grid[2].join("  ")}`,
  ].join("\n");
}

// ── Raw container builder helpers ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContainer(lines: string[], grid: SlotGrid | null, spinning: boolean, betRow: ActionRowBuilder<any>, btnRow: ActionRowBuilder<any>): object {
  return {
    type: ComponentType.Container,
    accent_color: CLR.PRIMARY,
    components: [
      { type: ComponentType.TextDisplay, content: lines.join("\n") },
      { type: ComponentType.Separator, divider: true, spacing: SeparatorSpacingSize.Small },
      { type: ComponentType.TextDisplay, content: renderGrid(grid, spinning) },
      { type: ComponentType.Separator, divider: true, spacing: SeparatorSpacingSize.Small },
      betRow.toJSON(),
      btnRow.toJSON(),
    ],
  };
}

// ── Message builders ──────────────────────────────────────────────────────────

export function buildSpinningMessage(game: SlotsGame): V2Reply {
  const lines = [
    `## Stella Slots`,
    `Balance  **${formatSC(game.balance)}**  ·  Bet  **${formatSC(game.bet)}**`,
    ``,
    `-# Spinning...`,
  ];

  const betMenu = new StringSelectMenuBuilder()
    .setCustomId("slots_bet")
    .setPlaceholder(`Bet: ${formatSC(game.bet)}`)
    .setDisabled(true)
    .addOptions(
      BETS.map(b =>
        new StringSelectMenuOptionBuilder()
          .setLabel(formatSC(b))
          .setValue(String(b))
          .setDefault(game.bet === b)
      )
    );

  const rollBtn = new ButtonBuilder()
    .setCustomId("slots_roll")
    .setLabel("Spin")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const endBtn = new ButtonBuilder()
    .setCustomId("slots_end")
    .setLabel("End Game")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const betRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(betMenu);
  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(rollBtn, endBtn);

  return {
    components: [buildContainer(lines, null, true, betRow, btnRow)],
    flags: MessageFlags.IsComponentsV2,
  };
}

export function buildGameMessage(
  game: SlotsGame,
  grid: SlotGrid | null,
  resultLabel: string | null,
): V2Reply {
  const isOver = game.ended || game.balance === 0;
  const canRoll = !isOver && game.balance >= game.bet;

  const lines: string[] = [
    `## Stella Slots`,
    `Balance  **${formatSC(game.balance)}**  ·  Bet  **${formatSC(game.bet)}**`,
  ];

  if (resultLabel) lines.push(``, resultLabel);

  if (game.ended) {
    lines.push(``, `-# Game over · Final balance: ${formatSC(game.balance)}`);
  } else if (game.balance === 0) {
    lines.push(``, `-# Broke · The game has ended.`);
  } else if (game.balance < game.bet) {
    lines.push(``, `-# Not enough SC for this bet — lower it or end the game.`);
  }

  const betMenu = new StringSelectMenuBuilder()
    .setCustomId("slots_bet")
    .setPlaceholder(`Bet: ${formatSC(game.bet)}`)
    .setDisabled(isOver)
    .addOptions(
      BETS.map(b =>
        new StringSelectMenuOptionBuilder()
          .setLabel(formatSC(b))
          .setValue(String(b))
          .setDefault(game.bet === b)
      )
    );

  const rollBtn = new ButtonBuilder()
    .setCustomId("slots_roll")
    .setLabel("Spin")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canRoll);

  const endBtn = new ButtonBuilder()
    .setCustomId("slots_end")
    .setLabel("End Game")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(isOver);

  const betRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(betMenu);
  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(rollBtn, endBtn);

  return {
    components: [buildContainer(lines, grid, false, betRow, btnRow)],
    flags: MessageFlags.IsComponentsV2,
  };
}
