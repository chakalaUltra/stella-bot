import { REST, Routes } from "discord.js";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env["DISCORD_TOKEN"];
const clientId = process.env["DISCORD_CLIENT_ID"];

if (!token || !clientId) {
  console.error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required.");
  process.exit(1);
}

const commandsPath = join(__dirname, "commands");
const commands: unknown[] = [];
const categories = readdirSync(commandsPath);

for (const category of categories) {
  const categoryPath = join(commandsPath, category);
  if (!statSync(categoryPath).isDirectory()) continue;

  const files = readdirSync(categoryPath).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
  for (const file of files) {
    const filePath = join(categoryPath, file);
    const mod = await import(filePath);
    const command = mod.default ?? mod.command;
    if (command?.data) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST().setToken(token);

try {
  console.log(`📡 Deploying ${commands.length} slash command(s)...`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`✅ Successfully deployed to guild ${guildId} (instant)`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ Successfully deployed globally (may take up to 1 hour)");
  }
} catch (error) {
  console.error("❌ Failed to deploy commands:", error);
}
