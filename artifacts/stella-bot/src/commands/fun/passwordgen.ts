import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { StellaClient } from "../../client.js";
import { cardReply, errReply, CLR } from "../../utils/ui.js";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function generatePassword(length: number): string {
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)]!;
  const required = [rand(UPPER), rand(LOWER), rand(DIGITS), rand(SYMBOLS)];
  const rest = Array.from({ length: length - 4 }, () => rand(ALL));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join("");
}

export default {
  category: "Utility",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("passwordgen")
    .setDescription("Generate a secure random password (sent only to you)")
    .addIntegerOption(o =>
      o.setName("length")
        .setDescription("Password length (8–64, default 16)")
        .setMinValue(8)
        .setMaxValue(64)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const length = interaction.options.getInteger("length") ?? 16;

    if (length < 8 || length > 64) {
      return interaction.reply({ ...errReply("Length must be between 8 and 64."), ephemeral: true });
    }

    const password = generatePassword(length);

    return interaction.reply({
      ...cardReply(
        `## 🔑 Password Generated\n\`\`\`${password}\`\`\`\n-# ${length} characters · uppercase, lowercase, numbers & symbols\n-# ⚠️ Don't share this with anyone.`,
        CLR.INFO
      ),
      ephemeral: true,
    });
  },
};
