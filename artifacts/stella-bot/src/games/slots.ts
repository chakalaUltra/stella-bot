import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from "discord.js";
import { box, td, CLR, type V2Reply } from "../utils/ui.js";

export const COIN = "⭐";
export const START_BALANCE = 10;

export interface SlotsGame {
  userId: string;
  balance: number;
  bet: number;
  ended: boolean;
}

export const activeGames = new Map<string, SlotsGame>();

export const SYMBOLS = ["7️⃣", "💎", "⭐", "🍒", "🍋", "🍊"] as const;
type Symbol = (typeof SYMBOLS)[number];

export function spin(): [Symbol, Symbol, Symbol] {
  const r = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  return [r(), r(), r()];
}

export function calcResult(
  reels: [Symbol, Symbol, Symbol],
  bet: number,
): { payout: number; label: string } {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    if (a === "7️⃣") return { payout: bet * 10, label: "🎉 **JACKPOT!** Three 7s!" };
    if (a === "💎") return { payout: bet * 7, label: "💎 **Diamond Triple!**" };
    return { payout: bet * 3, label: "✨ **Triple Match!**" };
  }
  if (a === b || b === c || a === c) {
    return { payout: bet, label: "🔔 **Pair** — bet returned." };
  }
  return { payout: 0, label: "💸 No match." };
}

export function buildGameMessage(
  game: SlotsGame,
  reels: [Symbol, Symbol, Symbol] | null,
  resultLabel: string | null,
): V2Reply {
  const reelStr = reels
    ? `# ${reels[0]}  ${reels[1]}  ${reels[2]}`
    : `# 🎰  🎰  🎰`;

  const balanceLine = `${COIN} **Balance:** ${game.balance} SC  ·  ${COIN} **Bet:** ${game.bet} SC`;

  const lines: string[] = [
    `## 🎰 Stella Slots`,
    balanceLine,
    ``,
    reelStr,
  ];

  if (resultLabel) lines.push(``, resultLabel);

  if (game.ended) {
    lines.push(``, `-# Game over — final balance: ${COIN} ${game.balance} SC`);
  } else if (game.balance === 0) {
    lines.push(``, `-# You're out of coins! The game has ended.`);
  } else if (game.balance < game.bet) {
    lines.push(``, `-# ⚠️ Not enough SC to cover your bet — lower it or end the game.`);
  }

  const isOver = game.ended || game.balance === 0;
  const canRoll = !isOver && game.balance >= game.bet;

  const betMenu = new StringSelectMenuBuilder()
    .setCustomId("slots_bet")
    .setPlaceholder(`Bet: ${game.bet} SC`)
    .setDisabled(isOver)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("1 SC").setValue("1").setEmoji("⭐").setDefault(game.bet === 1),
      new StringSelectMenuOptionBuilder().setLabel("2 SC").setValue("2").setEmoji("⭐").setDefault(game.bet === 2),
      new StringSelectMenuOptionBuilder().setLabel("5 SC").setValue("5").setEmoji("⭐").setDefault(game.bet === 5),
      new StringSelectMenuOptionBuilder().setLabel("10 SC").setValue("10").setEmoji("⭐").setDefault(game.bet === 10),
    );

  const rollBtn = new ButtonBuilder()
    .setCustomId("slots_roll")
    .setLabel("🎰 Roll")
    .setStyle(canRoll ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setDisabled(!canRoll);

  const endBtn = new ButtonBuilder()
    .setCustomId("slots_end")
    .setLabel("End Game")
    .setStyle(isOver ? ButtonStyle.Secondary : ButtonStyle.Danger)
    .setDisabled(isOver);

  const betRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(betMenu);
  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(rollBtn, endBtn);

  const color = isOver
    ? CLR.INFO
    : reels === null
      ? CLR.PRIMARY
      : resultLabel?.includes("JACKPOT") || resultLabel?.includes("Diamond") || resultLabel?.includes("Triple")
        ? CLR.SUCCESS
        : resultLabel?.includes("Pair")
          ? CLR.WARNING
          : CLR.ERROR;

  return {
    components: [
      box(color, [td(lines.join("\n"))]),
      betRow,
      btnRow,
    ],
    flags: MessageFlags.IsComponentsV2,
  };
}
