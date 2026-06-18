// Uses Tenor's publicly-documented anonymous demo key — no registration required.
const TENOR_ANON_KEY = "LIVDSRZULELA";
const TENOR_API_URL = "https://api.tenor.com/v1/search";

interface TenorV1Response {
  results: Array<{
    media: Array<{
      gif?: { url: string };
      tinygif?: { url: string };
    }>;
  }>;
}

export async function searchGif(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    q: query,
    key: TENOR_ANON_KEY,
    client_key: "stella_bot",
    limit: "8",
    contentfilter: "medium",
    media_filter: "minimal",
    ar_range: "standard",
  });

  try {
    const res = await fetch(`${TENOR_API_URL}?${params}`, {
      headers: { "User-Agent": "StellaBot/1.0" },
    });
    if (!res.ok) {
      console.error("[Stella] Tenor returned", res.status);
      return null;
    }

    const data = (await res.json()) as TenorV1Response;
    if (!data.results?.length) return null;

    // Pick randomly from top results for variety
    const pick =
      data.results[Math.floor(Math.random() * Math.min(5, data.results.length))]!;
    return pick.media[0]?.gif?.url ?? pick.media[0]?.tinygif?.url ?? null;
  } catch (err) {
    console.error("[Stella] Tenor fetch failed:", err);
    return null;
  }
}
