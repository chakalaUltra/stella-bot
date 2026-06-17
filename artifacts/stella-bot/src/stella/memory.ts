import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { STYLE_SAMPLES_LIMIT } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");
const MEMORY_FILE = join(DATA_DIR, "stella-memory.json");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

interface UserStyleProfile {
  samples: string[];
  avgLength: number;
  lastSeen: number;
}

interface StellaMemory {
  facts: string[];
  users: Record<string, UserStyleProfile>;
}

function load(): StellaMemory {
  if (!existsSync(MEMORY_FILE)) return { facts: [], users: {} };
  try {
    return JSON.parse(readFileSync(MEMORY_FILE, "utf8")) as StellaMemory;
  } catch {
    return { facts: [], users: {} };
  }
}

function save(data: StellaMemory): void {
  writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), "utf8");
}

export const stellaMemory = {
  addFact(fact: string): void {
    const data = load();
    if (!data.facts.includes(fact)) {
      data.facts.push(fact);
      save(data);
    }
  },

  removeFact(index: number): boolean {
    const data = load();
    if (index < 0 || index >= data.facts.length) return false;
    data.facts.splice(index, 1);
    save(data);
    return true;
  },

  getFacts(): string[] {
    return load().facts;
  },

  learnUserStyle(userId: string, message: string): void {
    if (message.length < 3) return;
    const data = load();
    if (!data.users[userId]) {
      data.users[userId] = { samples: [], avgLength: 0, lastSeen: Date.now() };
    }
    const profile = data.users[userId]!;
    profile.samples.push(message);
    if (profile.samples.length > STYLE_SAMPLES_LIMIT) {
      profile.samples.shift();
    }
    const total = profile.samples.reduce((sum, s) => sum + s.length, 0);
    profile.avgLength = Math.round(total / profile.samples.length);
    profile.lastSeen = Date.now();
    save(data);
  },

  getStyleProfile(userId: string): UserStyleProfile | null {
    return load().users[userId] ?? null;
  },

  buildStyleDescription(userId: string): string {
    const profile = load().users[userId];
    if (!profile || profile.samples.length < 3) return "";
    const recent = profile.samples.slice(-8);
    return [
      `Average message length: ~${profile.avgLength} characters.`,
      `Recent messages (mirror this style):\n${recent.map((s) => `  - "${s}"`).join("\n")}`,
    ].join("\n");
  },
};
