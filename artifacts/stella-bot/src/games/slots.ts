import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from "discord.js";
import { box, td, divider, CLR, type V2Reply } from "../utils/ui.js";

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

function renderGrid(grid: SlotGrid | null): string {
  if (!grid) {
    const blank = `${IDLE_SYM}  ${IDLE_SYM}  ${IDLE_SYM}  ${IDLE_SYM}  ${IDLE_SYM}`;
    return [`  ${blank}`, `▸ ${blank} ◂`, `  ${blank}`].join("\n");
  }
  return [
    `  ${grid[0].join("  ")}`,
    `▸ ${grid[1].join("  ")} ◂`,
    `  ${grid[2].join("  ")}`,
  ].join("\n");
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
    .setStyle(canRoll ? ButtonStyle.Primary : ButtonStyle.Secondary)
    .setDisabled(!canRoll);

  const endBtn = new ButtonBuilder()
    .setCustomId("slots_end")
    .setLabel("End Game")
    .setStyle(isOver ? ButtonStyle.Secondary : ButtonStyle.Danger)
    .setDisabled(isOver);

  const betRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(betMenu);
  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(rollBtn, endBtn);

  return {
    components: [
      box(CLR.PRIMARY, [
        td(lines.join("\n")),
        divider(),
        td(renderGrid(grid)),
      ]),
      betRow,
      btnRow,
    ],
    flags: MessageFlags.IsComponentsV2,
  };
}
