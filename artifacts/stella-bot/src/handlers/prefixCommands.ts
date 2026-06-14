import { readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { StellaClient } from "../client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadPrefixCommands(client: StellaClient): Promise<void> {
  const commandsPath = join(__dirname, "../commands-prefix");
  const categories = readdirSync(commandsPath);

  let loaded = 0;

  for (const category of categories) {
    const categoryPath = join(commandsPath, category);
    if (!statSync(categoryPath).isDirectory()) continue;

    const files = readdirSync(categoryPath).filter(f => f.endsWith(".ts") || f.endsWith(".js"));

    for (const file of files) {
      const filePath = join(categoryPath, file);
      try {
        const mod = await import(filePath);
        const command = mod.default ?? mod.command;
        if (!command?.name || !command?.execute) continue;

        client.prefixCommands.set(command.name, command);
        for (const alias of command.aliases ?? []) {
          client.prefixCommands.set(alias, command);
        }
        loaded++;
      } catch (err) {
        console.error(`[PrefixCommands] Failed to load ${file}:`, err);
      }
    }
  }

  console.log(`[PrefixCommands] Loaded ${loaded} prefix commands`);
}
