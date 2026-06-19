import { MISTRAL_MODEL, MISTRAL_API_URL } from "./config.js";

// Content can be plain text OR a multimodal array (text + images)
export type MistralContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string };

export interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string | MistralContentPart[];
}

export async function callMistral(
  messages: MistralMessage[],
  model: string = MISTRAL_MODEL,
): Promise<string> {
  const apiKey = process.env["MISTRAL_API_KEY"];
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not set.");

  const res = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown error");
    throw new Error(`Mistral API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message.content?.trim() ?? "";
}
