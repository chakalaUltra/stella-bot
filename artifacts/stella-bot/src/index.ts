import { StellaClient } from "./client.js";
import { loadCommands } from "./handlers/commands.js";
import { loadPrefixCommands } from "./handlers/prefixCommands.js";
import { loadEvents } from "./handlers/events.js";
import { BOT_NAME, EMOJIS } from "./config.js";

const token = process.env["DISCORD_TOKEN"];
const clientId = process.env["DISCORD_CLIENT_ID"];

if (!token) {
  console.error(`${EMOJIS.CROSS} DISCORD_TOKEN environment variable is required.`);
  console.error("Please add your bot token to the environment secrets.");
  process.exit(1);
}

if (!clientId) {
  console.error(`${EMOJIS.CROSS} DISCORD_CLIENT_ID environment variable is required.`);
  console.error("Please add your bot's Application ID to the environment secrets.");
  process.exit(1);
}

const client = new StellaClient();

console.log(`${EMOJIS.SPARKLE} Starting ${BOT_NAME}...`);
console.log(`${EMOJIS.INFO} Client ID: ${clientId}`);

await loadCommands(client);
await loadPrefixCommands(client);
await loadEvents(client);

await client.login(token);
