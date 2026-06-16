import { MessageFlags } from "discord.js";
import type { PrefixCommand } from "../../types.js";
import { errReply } from "../../utils/ui.js";
import { fetchKissGif } from "../../utils/kiss.js";
import { buildKissCard } from "../../commands/fun/kiss.js";

export default {
  name: "kiss",
  aliases: ["smooch"],
  description: "Kiss another user!",
  usage: "s!kiss @user",
  category: "Fun",

  async execute(message, _args) {
    const target = message.mentions.users.first();

    if (!target) {
      return message.reply(errReply("Please mention a user to kiss!"));
    }
    if (target.id === message.author.id) {
      return message.reply(errReply("You can't kiss yourself!"));
    }
    if (target.bot) {
      return message.reply(errReply("You can't kiss a bot!"));
    }

    const gifUrl = await fetchKissGif();
    const card = buildKissCard(message.author.id, target.id, gifUrl, false);

    return message.reply({
      components: [card],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [target.id] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  },
} satisfies PrefixCommand;
