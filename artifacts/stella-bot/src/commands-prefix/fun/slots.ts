import type { PrefixCommand } from "../../types.js";
import { activeGames, buildGameMessage, START_BALANCE, BETS } from "../../games/slots.js";
import { errReply } from "../../utils/ui.js";

export default {
  name: "slots",
  aliases: ["slot"],
  description: "Play Stella Slots! Start with 10.00 SC and try your luck.",
  usage: "s!slots",
  category: "Fun",

  async execute(message, _args) {
    if (activeGames.has(message.author.id)) {
      return message.reply(errReply("You already have an active slots game! Finish it first."));
    }

    const game = {
      userId: message.author.id,
      balance: START_BALANCE,
      bet: BETS[0],
      ended: false,
    };

    activeGames.set(message.author.id, game);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return message.reply(buildGameMessage(game, null, null) as any);
  },
} satisfies PrefixCommand;
