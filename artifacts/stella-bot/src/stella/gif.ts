const TENOR_API_URL = "https://tenor.googleapis.com/v2/search";

interface TenorResponse {
  results: Array<{
    url: string;
    media_formats: {
      gif?: { url: string };
      tinygif?: { url: string };
    };
  }>;
}

export async function searchGif(query: string): Promise<string | null> {
  const apiKey = process.env["TENOR_API_KEY"];
  if (!apiKey) {
    console.warn("[Stella] TENOR_API_KEY not set — GIF search skipped.");
    return null;
  }

  const params = new URLSearchParams({
    q: query,
    key: apiKey,
    client_key: "stella_bot",
    limit: "8",
    media_filter: "gif",
    contentfilter: "medium",
    ar_range: "standard",
  });

  try {
    const res = await fetch(`${TENOR_API_URL}?${params}`);
    if (!res.ok) {
      console.error("[Stella] Tenor API error:", res.status);
      return null;
    }

    const data = (await res.json()) as TenorResponse;
    if (!data.results?.length) return null;

    // Pick randomly from top results for variety
    const pick =
      data.results[Math.floor(Math.random() * Math.min(5, data.results.length))]!;
    return pick.media_formats.gif?.url ?? pick.url;
  } catch (err) {
    console.error("[Stella] Tenor fetch failed:", err);
    return null;
  }
}
