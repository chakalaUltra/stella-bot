export interface StickyEntry {
  content: string;
  messageId: string | null;
}

export const stickyStore = new Map<string, StickyEntry>();
