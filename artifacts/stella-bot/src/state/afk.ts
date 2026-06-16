export interface AfkEntry {
  reason: string;
  since: number;
  originalNickname: string | null;
}

export const afkStore = new Map<string, AfkEntry>();
