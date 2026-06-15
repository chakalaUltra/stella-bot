export interface AfkEntry {
  reason: string;
  since: number;
}

export const afkStore = new Map<string, AfkEntry>();
