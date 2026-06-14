import { StellaClient } from "./client.js";
import { loadCommands } from "./handlers/commands.js";
import { loadEvents } from "./handlers/events.js";
import { BOT_NAME, EMOJIS } from "./config.js";

const token = process.env["DISCORD_TOKEN"];

if (!token) {
  console.error(`${EMOJIS.CROSS} DISCORD_TOKEN environment variable is required.`);
  console.error("Please add your bot token to the environment secrets.");
  process.exit(1);
}

const client = new StellaClient();

console.log(`${EMOJIS.SPARKLE} Starting ${BOT_NAME}...`);

await loadCommands(client);
await loadEvents(client);

await client.login(token);
