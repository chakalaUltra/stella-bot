import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import type { StellaClient } from "../../client.js";
import { errReply, CLR } from "../../utils/ui.js";
import { fetchKissGif } from "../../utils/kiss.js";

export function buildKissCard(
  kisserId: string,
  kissedId: string,
  gifUrl: string | null,
  kissedBack: boolean,
): object {
  const text = kissedBack
    ? `## 💋 Kiss\n<@${kisserId}> kissed <@${kissedId}>!\n<@${kissedId}> kissed back!`
    : `## 💋 Kiss\n<@${kisserId}> kissed <@${kissedId}>!`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comps: any[] = [{ type: ComponentType.TextDisplay, content: text }];

  if (gifUrl) {
    comps.push({ type: ComponentType.MediaGallery, items: [{ media: { url: gifUrl } }] });
  }

  if (!kissedBack) {
    const btn = new ButtonBuilder()
      .setCustomId(`kiss_back:${kisserId}:${kissedId}`)
      .setLabel("Kiss Back 💋")
      .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
    comps.push(
      { type: ComponentType.Separator, divider: true, spacing: SeparatorSpacingSize.Small },
      row.toJSON(),
    );
  }

  return {
    type: ComponentType.Container,
    accent_color: CLR.PRIMARY,
    components: comps,
  };
}

export default {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("kiss")
    .setDescription("Kiss another user!")
    .addUserOption(opt =>
      opt.setName("user").setDescription("The user to kiss").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: StellaClient) {
    const target = interaction.options.getUser("user", true);

    if (target.id === interaction.user.id) {
      return interaction.reply({ ...errReply("You can't kiss yourself!"), ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ ...errReply("You can't kiss a bot!"), ephemeral: true });
    }

    await interaction.deferReply();

    const gifUrl = await fetchKissGif();
    const card = buildKissCard(interaction.user.id, target.id, gifUrl, false);

    return interaction.editReply({
      components: [card],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [target.id] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  },
};
