// Scraper manners (phase 03): a User-Agent naming the app, a 10-second timeout, sequential requests.
export const USER_AGENT = "HackOps/0.1 (team hackathon tracker; +https://github.com/United-Larper/hackops)";

export async function get(url: string, accept = "application/json") {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res;
}

/** Plain text from a scraped snippet: tags dropped, entities decoded, whitespace collapsed. React escapes it again on render. */
export function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
