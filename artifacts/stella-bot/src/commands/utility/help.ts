import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
  MessageFlags,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { box, td, divider, CLR, type V2Reply } from "../../utils/ui.js";
import { BOT_NAME } from "../../config.js";

const CATEGORY_ICONS: Record<string, string> = {
  Moderation: "Moderation",
  Utility: "Utility",
  Fun: "Fun",
  Tickets: "Tickets",
  Settings: "Settings",
};

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(`Browse all of ${BOT_NAME}'s commands`),

  async execute(interaction: ChatInputCommandInteraction, client: StellaClient) {
    const categories = new Map<string, string[]>();
    for (const [name, cmd] of client.commands) {
      if (!categories.has(cmd.category)) categories.set(cmd.category, []);
      categories.get(cmd.category)!.push(name);
    }

    const buildHomeContainer = () => {
      const overview = [...categories.entries()]
        .map(([cat, cmds]) => `**${cat}** · ${cmds.length} commands`)
        .join("\n");

      return box(CLR.PRIMARY, [
        td(`## ${BOT_NAME}\nYour multi-purpose cosmic companion`),
        divider(),
        td(overview),
        divider(),
        td("-# Select a category below to see its commands"),
      ]);
    };

    const buildCategoryContainer = (cat: string) => {
      const cmds = categories.get(cat) ?? [];
      const list = cmds.map(name => {
        const cmd = client.commands.get(name)!;
        return `**/${name}** · ${(cmd.data as SlashCommandBuilder).description}`;
      }).join("\n");

      return box(CLR.PRIMARY, [
        td(`## ${cat}`),
        divider(),
        td(list || "No commands."),
      ]);
    };

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category")
      .setPlaceholder("Select a category…")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("Overview").setValue("home").setDescription("All categories at a glance"),
        ...[...categories.keys()].map(cat =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat)
            .setValue(cat)
            .setDescription(`${categories.get(cat)!.length} commands`)
        )
      );

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      components: [buildHomeContainer(), menuRow],
      flags: MessageFlags.IsComponentsV2,
    } as V2Reply);

    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on("collect", async i => {
      const value = i.values[0]!;
      const newContainer = value === "home" ? buildHomeContainer() : buildCategoryContainer(value);

      await i.update({
        components: [newContainer, menuRow],
        flags: MessageFlags.IsComponentsV2,
      } as V2Reply);
    });

    collector.on("end", () => {
      interaction.editReply({ components: [buildHomeContainer()] }).catch(() => null);
    });
  },
};
