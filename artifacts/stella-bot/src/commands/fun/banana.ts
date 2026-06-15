import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, CLR } from "../../utils/ui.js";

const COMMENTS: Record<string, string> = {
  tiny:   "That's... a baby banana. 🐣",
  small:  "Modest, but it's there!",
  medium: "Perfectly average. Nothing to write home about.",
  large:  "That's a solid banana. 🤝",
  huge:   "Okay that's impressive. 👀",
  mega:   "SCIENTIFICALLY IMPOSSIBLE. We don't believe you. 🤯",
};

function getComment(cm: number): string {
  if (cm <= 5) return COMMENTS.tiny!;
  if (cm <= 10) return COMMENTS.small!;
  if (cm <= 16) return COMMENTS.medium!;
  if (cm <= 22) return COMMENTS.large!;
  if (cm <= 28) return COMMENTS.huge!;
  return COMMENTS.mega!;
}

export default {
  category: "Fun",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("banana")
    .setDescription("Find out how long a user's banana is 🍌 (just a joke!)")
    .addUserOption(o =>
      o.setName("user").setDescription("Who's banana to measure?").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const cm = Math.floor(Math.random() * 30) + 1;
    const bar = "🍌".repeat(Math.ceil(cm / 5));
    const comment = getComment(cm);

    return interaction.reply(
      cardReply(
        `## 🍌 Banana Meter\n**${target.displayName}'s** banana is **${cm} cm** long!\n${bar}\n-# ${comment}\n-# *(This is purely a joke — don't take it seriously!)*`,
        CLR.WARNING
      )
    );
  },
};
