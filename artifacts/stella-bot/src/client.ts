import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import type { Command } from "./types.js";

export class StellaClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public prefixCommands: Collection<string, import("./types.js").PrefixCommand> = new Collection();
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember,
      ],
      allowedMentions: {
        parse: [],
        repliedUser: false,
      },
    });
  }
}
