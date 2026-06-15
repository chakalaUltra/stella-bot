import { AttachmentBuilder, type TextChannel } from "discord.js";

/**
 * Fetches up to 500 messages from a channel and formats them as a plain-text transcript.
 * Returns an AttachmentBuilder ready to send.
 */
export async function buildTranscript(
  channel: TextChannel,
  ticketId: string,
  createdByTag: string,
  closedByTag: string,
): Promise<AttachmentBuilder> {
  const batches: import("discord.js").Message[] = [];
  let before: string | undefined;

  for (let i = 0; i < 5; i++) {
    const fetched = await channel.messages.fetch({ limit: 100, before });
    if (fetched.size === 0) break;
    batches.push(...fetched.values());
    before = fetched.last()?.id;
    if (fetched.size < 100) break;
  }

  const messages = batches.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const header = [
    `=== Ticket #${ticketId} Transcript ===`,
    `Server:     ${channel.guild.name}`,
    `Channel:    #${channel.name}`,
    `Created by: ${createdByTag}`,
    `Closed by:  ${closedByTag}`,
    `Date:       ${new Date().toUTCString()}`,
    `Messages:   ${messages.length}`,
    "=".repeat(40),
    "",
  ].join("\n");

  const lines = messages.map(msg => {
    const time = msg.createdAt.toISOString().replace("T", " ").slice(0, 19);
    const author = msg.author.tag;
    let content = msg.content || "";

    if (msg.attachments.size > 0) {
      const urls = [...msg.attachments.values()].map(a => `[Attachment: ${a.name}] ${a.url}`).join("\n");
      content = content ? `${content}\n${urls}` : urls;
    }
    if (msg.embeds.length > 0 && !content) {
      content = "[Embed]";
    }
    if (!content) content = "[No text content]";

    return `[${time}] ${author}: ${content}`;
  });

  const text = header + lines.join("\n");
  const buffer = Buffer.from(text, "utf-8");

  return new AttachmentBuilder(buffer, { name: `transcript-${ticketId}.txt` });
}
