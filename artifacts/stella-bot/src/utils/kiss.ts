export async function fetchKissGif(): Promise<string | null> {
  try {
    const res = await fetch("https://nekos.best/api/v2/kiss");
    if (!res.ok) return null;
    const data = (await res.json()) as { results: { url: string }[] };
    return data.results[0]?.url ?? null;
  } catch {
    return null;
  }
}
