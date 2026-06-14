import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { createEmbed, infoEmbed } from "../../utils/embed.js";
import { COLORS, EMOJIS, BOT_NAME } from "../../config.js";

const CATEGORY_EMOJIS: Record<string, string> = {
  Moderation: "🛡️",
  Utility: "🔧",
  Fun: "🎉",
  Tickets: "🎫",
  Settings: "⚙️",
};

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Browse all of Stella's commands"),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    const categories = new Map<string, string[]>();

    for (const [name, cmd] of client.commands) {
      if (!categories.has(cmd.category)) categories.set(cmd.category, []);
      categories.get(cmd.category)!.push(name);
    }

    const totalCommands = client.commands.size;

    const homeEmbed = createEmbed({
      title: `${EMOJIS.STAR} ${BOT_NAME} — Command Center`,
      description: `> Your cosmic multi-purpose Discord companion\n\nUse the menu below to explore **${totalCommands}** commands across ${categories.size} categories.`,
      color: COLORS.PRIMARY,
      fields: [...categories.entries()].map(([cat, cmds]) => ({
        name: `${CATEGORY_EMOJIS[cat] ?? "📂"} ${cat}`,
        value: `\`${cmds.length} commands\``,
        inline: true,
      })),
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category")
      .setPlaceholder("📂 Select a category...")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("Home").setValue("home").setEmoji("🏠").setDescription("Overview of all categories"),
        ...[...categories.keys()].map(cat =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat)
            .setValue(cat)
            .setEmoji(CATEGORY_EMOJIS[cat] ?? "📂")
            .setDescription(`View all ${categories.get(cat)!.length} ${cat.toLowerCase()} commands`)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const reply = await interaction.reply({ embeds: [homeEmbed], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on("collect", async i => {
      const value = i.values[0]!;

      if (value === "home") {
        await i.update({ embeds: [homeEmbed], components: [row] });
        return;
      }

      const cmds = categories.get(value) ?? [];
      const fields = cmds.map(name => {
        const cmd = client.commands.get(name)!;
        return { name: `\`/${name}\``, value: (cmd.data as SlashCommandBuilder).description, inline: true };
      });

      const categoryEmbed = createEmbed({
        title: `${CATEGORY_EMOJIS[value] ?? "📂"} ${value} Commands`,
        description: `${cmds.length} command(s) in this category`,
        color: COLORS.NEUTRAL,
        fields,
      });

      await i.update({ embeds: [categoryEmbed], components: [row] });
    });

    collector.on("end", () => {
      interaction.editReply({ components: [] }).catch(() => null);
    });
  },
};
