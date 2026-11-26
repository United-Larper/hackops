import { setTimeout as sleep } from "node:timers/promises";
import { summariseWinners, type PastWinner, type WinnersBrief } from "@hackops/shared";
import { get, plainText } from "../discovery/http";

// "What wins here" and Devpost prize tracks (phase 10). ⚠ Devpost HTML, not a documented API: checked against live pages
// on 2026-11-26 (test/fixtures/devpost-gallery.html, devpost-project.html, devpost-event.html).
// Scraper manners as in phase 03, plus a pause between project pages. A full brief costs 1 listing + 3 galleries
// + up to 18 project pages, then is cached for a week per organizer.

const EDITIONS = 3;
const WINNERS_PER_EDITION = 6;
const PAUSE_MS = 500;
const WEEK = 7 * 86_400_000;
/** Any type, as curl sends: Cloudflare challenges a non-browser that asks for text/html. robots.txt allows these pages. */
const HTML = "*/*";

type EndedPage = { hackathons: { url: string; organization_name: string | null; winners_announced: boolean; submission_gallery_url: string }[] };

/** Only Devpost pages are fetched: listing data and event URLs pass through here before any request. */
export const isDevpost = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "devpost.com" || u.hostname.endsWith(".devpost.com"));
  } catch {
    return false;
  }
};

/** Winning tiles of a gallery page (`?winners=true` lists winners first): project link and team size from the avatars. */
export function parseGallery(html: string): { url: string; teamSize: number }[] {
  const out: { url: string; teamSize: number }[] = [];
  for (const chunk of html.split('class="large-4 small-12 columns gallery-item"').slice(1)) {
    const tile = chunk.split('class="counts"')[0];
    if (!tile.includes('class="winner"')) break;
    const url = tile.match(/href="(https:\/\/devpost\.com\/software\/[^"]+)"/)?.[1];
    const members = tile.split('class="small members')[1] ?? "";
    if (url) out.push({ url, teamSize: members.match(/class="user-photo/g)?.length ?? 0 }); // anonymous members have a photo, no profile link
  }
  return out;
}

/** A project page's "Built with" tags and whether it embeds a video. */
export function parseProject(html: string): Omit<PastWinner, "teamSize"> {
  const builtWith = html.split('id="built-with"')[1]?.split("</ul>")[0] ?? "";
  const tech = [...builtWith.matchAll(/class="cp-tag[^"]*">([\s\S]*?)<\/span>/g)].map((m) => plainText(m[1])).filter(Boolean);
  return { tech, hasVideo: html.includes('class="video-embed"') };
}

/** Prize tracks from an event page's Prizes section. Unvalidated: the caller runs them through PrizeTrackSchema. */
export function parsePrizes(html: string): { name: string; prize: string | null; description: string | null }[] {
  const section = html.split('id="prizes"')[1]?.split("</article>")[0] ?? "";
  return section
    .split(/ id="prize_\d+">/)
    .slice(1)
    .map((chunk) => ({
      name: plainText(chunk.match(/class="prize-title">([\s\S]*?)<\/h6>/)?.[1] ?? ""),
      prize: plainText(chunk.match(/class="prize-value">([\s\S]*?)<\/div>/)?.[1] ?? "") || null,
      description: plainText(chunk.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "") || null,
    }))
    .filter((t) => t.name);
}

async function load(organizer: string): Promise<WinnersBrief | null> {
  const listing = `https://devpost.com/api/hackathons?status[]=ended&organization=${encodeURIComponent(organizer)}&per_page=10`;
  const page = (await (await get(listing)).json()) as EndedPage;
  // ponytail: takes the first three ended editions in Devpost's order, not by date; sort by end date if that ever misleads.
  const editions = page.hackathons
    .filter((h) => h.winners_announced && h.organization_name === organizer && isDevpost(h.submission_gallery_url))
    .slice(0, EDITIONS);
  if (!editions.length) return null;

  const winners: PastWinner[] = [];
  for (const e of editions) {
    const gallery = new URL(e.submission_gallery_url);
    gallery.searchParams.set("winners", "true");
    const tiles = parseGallery(await (await get(gallery.href, HTML)).text()).slice(0, WINNERS_PER_EDITION);
    for (const t of tiles) {
      await sleep(PAUSE_MS);
      // One missing project page doesn't sink the brief: that winner is left out.
      const project = await get(t.url, HTML).then((r) => r.text()).then(parseProject, () => null);
      if (project) winners.push({ ...project, teamSize: t.teamSize });
    }
  }
  return summariseWinners(winners, editions.length);
}

// ponytail: in-memory cache, so an API restart fetches again; move to a table if restarts get frequent.
const cache = new Map<string, { at: number; brief: Promise<WinnersBrief | null>; done?: WinnersBrief | null }>();

/** The brief for an organizer's past Devpost editions; null when there are none. Concurrent calls share one fetch; failures aren't cached. */
export function pastWinners(organizer: string, now = Date.now()): Promise<WinnersBrief | null> {
  const hit = cache.get(organizer);
  if (hit && now - hit.at < WEEK) return hit.brief;
  const entry: { at: number; brief: Promise<WinnersBrief | null>; done?: WinnersBrief | null } = { at: now, brief: load(organizer) };
  entry.brief.then((b) => (entry.done = b), () => cache.delete(organizer));
  cache.set(organizer, entry);
  return entry.brief;
}

/** Briefs already fetched, by organizer, for Discover (which never starts a fetch). */
export function cachedWinners(now = Date.now()): Record<string, WinnersBrief | null> {
  return Object.fromEntries([...cache].filter(([, e]) => e.done !== undefined && now - e.at < WEEK).map(([org, e]) => [org, e.done!]));
}

export async function fetchDevpostTracks(eventUrl: string) {
  if (!isDevpost(eventUrl)) throw new Error("Not a Devpost event page");
  return parsePrizes(await (await get(eventUrl, HTML)).text());
}
