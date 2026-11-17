import type { ScrapedHackathon } from "@hackops/shared";
import { get, plainText } from "./http";

// MLH season page. The page embeds its data as JSON (<script data-page="app">), which is steadier than
// scraping the markup. ⚠ Checked against a live page on 2026-11-17 (test/fixtures/mlh.html).

type MlhEvent = {
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  url: string;
  websiteUrl: string | null;
  formatType: "physical" | "digital" | "hybrid" | string;
  venueAddress: { city: string | null; country: string | null } | null;
  organizationName: string | null;
  customFields?: { hackathon_focus?: string[] };
};

const countryName = (code: string | null) => {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

/** The MLH season that is running now: seasons are named for the year they end in (Aug–Jul). */
export function currentSeason(now = new Date()) {
  return now.getUTCMonth() >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

export function parseMlh(html: string): ScrapedHackathon[] {
  const m = html.match(/<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("MLH page layout changed: embedded data not found");
  const events = (JSON.parse(m[1])?.props?.upcomingEvents ?? []) as MlhEvent[];
  return events.map((e) => {
    const mode = e.formatType === "digital" ? "online" : e.formatType === "hybrid" ? "hybrid" : "in_person";
    return {
      source: "mlh" as const,
      sourceId: e.slug,
      title: plainText(e.name),
      url: e.websiteUrl?.startsWith("http") ? e.websiteUrl : new URL(e.url, "https://www.mlh.com").href,
      organizer: e.organizationName ? plainText(e.organizationName) : "MLH",
      mode,
      city: mode === "online" ? null : e.venueAddress?.city?.trim() || null,
      country: mode === "online" ? null : countryName(e.venueAddress?.country ?? null),
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      registrationClosesAt: null,
      submissionDueAt: new Date(e.endsAt),
      judgingAt: null,
      prizeAmount: null,
      prizeCurrency: null,
      teamSizeMax: 4, // MLH member events cap teams at four
      eligibility: "Student hackathon (MLH member event)",
      prizeTracks: [],
      themes: [...(e.customFields?.hackathon_focus ?? []), "student"],
    };
  });
}

export async function fetchMlh(now = new Date()): Promise<ScrapedHackathon[]> {
  const html = await (await get(`https://www.mlh.com/seasons/${currentSeason(now)}/events`, "text/html")).text();
  return parseMlh(html);
}
