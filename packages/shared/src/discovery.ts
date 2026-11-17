import type { HackathonInput } from "./schemas";
import type { Source } from "./enums";

/** What a source fetcher returns: a hackathon ready to store, plus the raw themes used for auto-categories. */
export type ScrapedHackathon = Omit<HackathonInput, "categories" | "source" | "sourceId"> & {
  source: Exclude<Source, "manual" | "demo">;
  sourceId: string;
  themes: string[];
};

export function normaliseTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ") // "Hack KL 2026" and "Hack KL" are the same event
    .replace(/\s+/g, " ")
    .trim();
}

const DAY = 86_400_000;

/** Same event listed on two sources: same normalised title and start dates within three days (or both unknown). */
export function isSameEvent(
  a: { title: string; startsAt?: Date | string | null },
  b: { title: string; startsAt?: Date | string | null },
) {
  if (normaliseTitle(a.title) !== normaliseTitle(b.title)) return false;
  if (!a.startsAt || !b.startsAt) return !a.startsAt && !b.startsAt;
  return Math.abs(new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()) <= 3 * DAY;
}

/** Category slugs whose keywords appear as whole words in the text (title, themes, organiser). */
export function categorise(text: string, categories: { slug: string; keywords: string[] }[]) {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return categories
    .filter((c) => c.keywords.some((k) => hay.includes(` ${k.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `)))
    .map((c) => c.slug);
}
