import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { GuildSettings, Warning, Ticket, CommandPermission } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function readStore<T>(file: string, defaultVal: T): T {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return defaultVal;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return defaultVal;
  }
}

function writeStore<T>(file: string, data: T): void {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf8");
}

type GuildMap = Record<string, GuildSettings>;
type WarningList = Warning[];
type TicketList = Ticket[];
type PermList = CommandPermission[];

let nextWarningId = 1;
let nextTicketId = 1;
let nextPermId = 1;

const _warnings = readStore<WarningList>("warnings.json", []);
const _tickets = readStore<TicketList>("tickets.json", []);
const _perms = readStore<PermList>("permissions.json", []);

if (_warnings.length > 0) nextWarningId = Math.max(..._warnings.map(w => w.id)) + 1;
if (_tickets.length > 0) nextTicketId = Math.max(..._tickets.map(t => t.id)) + 1;
if (_perms.length > 0) nextPermId = Math.max(..._perms.map(p => p.id)) + 1;

export const guildDb = {
  get(guildId: string): GuildSettings {
    const guilds = readStore<GuildMap>("guilds.json", {});
    if (!guilds[guildId]) {
      guilds[guildId] = {
        guild_id: guildId,
        prefix: "s!",
        log_channel: null,
        welcome_channel: null,
        welcome_message: null,
        ticket_category: null,
        ticket_log_channel: null,
        ticket_support_role: null,
        ticket_count: 0,
        created_at: Math.floor(Date.now() / 1000),
      };
      writeStore("guilds.json", guilds);
    }
    return guilds[guildId]!;
  },

  update(guildId: string, data: Partial<Omit<GuildSettings, "guild_id" | "created_at">>): void {
    const guilds = readStore<GuildMap>("guilds.json", {});
    guildDb.get(guildId);
    Object.assign(guilds[guildId]!, data);
    writeStore("guilds.json", guilds);
  },

  incrementTicketCount(guildId: string): number {
    const guilds = readStore<GuildMap>("guilds.json", {});
    const settings = guildDb.get(guildId);
    const newCount = settings.ticket_count + 1;
    guilds[guildId]!.ticket_count = newCount;
    writeStore("guilds.json", guilds);
    return newCount;
  },
};

export const warningDb = {
  add(guildId: string, userId: string, moderatorId: string, reason: string): Warning {
    const warnings = readStore<WarningList>("warnings.json", []);
    const w: Warning = {
      id: nextWarningId++,
      guild_id: guildId,
      user_id: userId,
      moderator_id: moderatorId,
      reason,
      created_at: Math.floor(Date.now() / 1000),
    };
    warnings.push(w);
    writeStore("warnings.json", warnings);
    return w;
  },

  getAll(guildId: string, userId: string): Warning[] {
    const warnings = readStore<WarningList>("warnings.json", []);
    return warnings
      .filter(w => w.guild_id === guildId && w.user_id === userId)
      .sort((a, b) => b.created_at - a.created_at);
  },

  count(guildId: string, userId: string): number {
    const warnings = readStore<WarningList>("warnings.json", []);
    return warnings.filter(w => w.guild_id === guildId && w.user_id === userId).length;
  },

  clear(guildId: string, userId: string): number {
    const warnings = readStore<WarningList>("warnings.json", []);
    const before = warnings.length;
    const filtered = warnings.filter(w => !(w.guild_id === guildId && w.user_id === userId));
    writeStore("warnings.json", filtered);
    return before - filtered.length;
  },

  remove(id: number): void {
    const warnings = readStore<WarningList>("warnings.json", []);
    writeStore("warnings.json", warnings.filter(w => w.id !== id));
  },
};

export const ticketDb = {
  create(guildId: string, channelId: string, userId: string, ticketNumber: number, topic: string | null): Ticket {
    const tickets = readStore<TicketList>("tickets.json", []);
    const t: Ticket = {
      id: nextTicketId++,
      guild_id: guildId,
      channel_id: channelId,
      user_id: userId,
      ticket_number: ticketNumber,
      status: "open",
      topic,
      created_at: Math.floor(Date.now() / 1000),
      closed_at: null,
    };
    tickets.push(t);
    writeStore("tickets.json", tickets);
    return t;
  },

  getByChannel(channelId: string): Ticket | undefined {
    const tickets = readStore<TicketList>("tickets.json", []);
    return tickets.find(t => t.channel_id === channelId);
  },

  getByUser(guildId: string, userId: string): Ticket | undefined {
    const tickets = readStore<TicketList>("tickets.json", []);
    return tickets.find(t => t.guild_id === guildId && t.user_id === userId && t.status === "open");
  },

  close(channelId: string): void {
    const tickets = readStore<TicketList>("tickets.json", []);
    const ticket = tickets.find(t => t.channel_id === channelId);
    if (ticket) {
      ticket.status = "closed";
      ticket.closed_at = Math.floor(Date.now() / 1000);
      writeStore("tickets.json", tickets);
    }
  },

  getAll(guildId: string): Ticket[] {
    const tickets = readStore<TicketList>("tickets.json", []);
    return tickets.filter(t => t.guild_id === guildId).sort((a, b) => b.created_at - a.created_at);
  },
};

export const permissionDb = {
  set(guildId: string, commandName: string, roleId: string, allowed: boolean): void {
    const perms = readStore<PermList>("permissions.json", []);
    const existing = perms.find(p => p.guild_id === guildId && p.command_name === commandName && p.role_id === roleId);
    if (existing) {
      existing.allowed = allowed ? 1 : 0;
    } else {
      perms.push({ id: nextPermId++, guild_id: guildId, command_name: commandName, role_id: roleId, allowed: allowed ? 1 : 0 });
    }
    writeStore("permissions.json", perms);
  },

  getForCommand(guildId: string, commandName: string): CommandPermission[] {
    const perms = readStore<PermList>("permissions.json", []);
    return perms.filter(p => p.guild_id === guildId && p.command_name === commandName);
  },

  checkAccess(guildId: string, commandName: string, roleIds: string[]): boolean | null {
    if (roleIds.length === 0) return null;
    const perms = readStore<PermList>("permissions.json", []);
    const matching = perms.filter(p => p.guild_id === guildId && p.command_name === commandName && roleIds.includes(p.role_id));
    if (matching.length === 0) return null;
    return matching.some(p => p.allowed === 1);
  },

  remove(guildId: string, commandName: string, roleId: string): void {
    const perms = readStore<PermList>("permissions.json", []);
    writeStore("permissions.json", perms.filter(p => !(p.guild_id === guildId && p.command_name === commandName && p.role_id === roleId)));
  },

  getAll(guildId: string): CommandPermission[] {
    const perms = readStore<PermList>("permissions.json", []);
    return perms.filter(p => p.guild_id === guildId);
  },
};
