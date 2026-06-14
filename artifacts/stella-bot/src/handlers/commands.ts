import { readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { StellaClient } from "../client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client: StellaClient): Promise<void> {
  const commandsPath = join(__dirname, "../commands");
  const categories = readdirSync(commandsPath);

  let loaded = 0;
  let failed = 0;

  for (const category of categories) {
    const categoryPath = join(commandsPath, category);
    if (!statSync(categoryPath).isDirectory()) continue;

    const files = readdirSync(categoryPath).filter(f => f.endsWith(".ts") || f.endsWith(".js"));

    for (const file of files) {
      const filePath = join(categoryPath, file);
      try {
        const mod = await import(filePath);
        const command = mod.default ?? mod.command;

        if (!command?.data || !command?.execute) {
          console.warn(`[Commands] Skipping ${file}: missing data or execute`);
          continue;
        }

        client.commands.set(command.data.name, command);
        loaded++;
      } catch (err) {
        console.error(`[Commands] Failed to load ${file}:`, err);
        failed++;
      }
    }
  }

  console.log(`[Commands] Loaded ${loaded} commands${failed > 0 ? ` (${failed} failed)` : ""}`);
}
