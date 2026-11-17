import type { ScrapedHackathon } from "@hackops/shared";
import { get, plainText } from "./http";

// Devpost's public listing. ⚠ Not a documented API: fields checked against a live response on 2026-11-17
// (test/fixtures/devpost.json). Dates come only as text, e.g. "Oct 30 - Dec 04, 2026".

const LIST = "https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&per_page=40"; // without per_page it returns 9
const MAX_PAGES = 5; // 40 per page; about 150 open or upcoming events at a time

type DevpostHackathon = {
  id: number;
  title: string;
  url: string;
  open_state: string;
  organization_name: string | null;
  displayed_location: { location: string };
  submission_period_dates: string;
  themes: { name: string }[];
  prize_amount: string;
};
type DevpostPage = { hackathons: DevpostHackathon[]; meta: { total_count: number; per_page: number } };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const month = (m: string) => MONTHS.indexOf(m.slice(0, 3).toLowerCase());

/**
 * "Oct 30 - Dec 04, 2026" | "Nov 11 - 30, 2026" | "Nov 11, 2026 - Jan 11, 2027".
 * ponytail: Devpost shows no time, so the end is taken as 23:59 US Eastern (UTC-5), its usual default;
 * the event page has the exact time.
 */
export function parsePeriod(text: string): { start: Date; end: Date } | null {
  const m = text.trim().match(/^([A-Za-z]{3}) (\d{1,2})(?:, (\d{4}))? - (?:([A-Za-z]{3}) )?(\d{1,2}), (\d{4})$/);
  if (!m) return null;
  const [, m1, d1, y1, m2, d2, y2] = m;
  const endMonth = month(m2 ?? m1);
  const startMonth = month(m1);
  if (startMonth < 0 || endMonth < 0) return null;
  const endYear = Number(y2);
  const startYear = y1 ? Number(y1) : startMonth > endMonth ? endYear - 1 : endYear;
  return {
    start: new Date(Date.UTC(startYear, startMonth, Number(d1))),
    end: new Date(Date.UTC(endYear, endMonth, Number(d2), 23 + 5, 59)), // 23:59 UTC-5
  };
}

/** "$<span>100,000</span>" → 100000 USD; also €, £, ₹, RM, S$ and "$CAD". */
export function parsePrize(html: string): { amount: number | null; currency: string | null } {
  const text = plainText(html);
  const amount = Number(text.replace(/[^0-9]/g, ""));
  if (!amount) return { amount: null, currency: null };
  const currency = /CAD/.test(text) ? "CAD" : /AUD|A\$/.test(text) ? "AUD" : /S\$|SGD/.test(text) ? "SGD" : /RM|MYR/.test(text) ? "MYR"
    : text.includes("€") ? "EUR" : text.includes("£") ? "GBP" : text.includes("₹") ? "INR" : "USD";
  return { amount, currency };
}

export function parseDevpost(page: DevpostPage): ScrapedHackathon[] {
  return page.hackathons
    .filter((h) => h.open_state !== "ended")
    .map((h) => {
      const period = parsePeriod(h.submission_period_dates);
      const prize = parsePrize(h.prize_amount);
      const location = plainText(h.displayed_location?.location ?? "Online");
      const online = location.toLowerCase() === "online";
      return {
        source: "devpost" as const,
        sourceId: String(h.id),
        title: plainText(h.title),
        url: h.url,
        organizer: h.organization_name ? plainText(h.organization_name) : null,
        mode: online ? ("online" as const) : ("in_person" as const),
        city: online ? null : location,
        country: online ? null : /malaysia/i.test(location) ? "Malaysia" : null,
        startsAt: period?.start ?? null,
        endsAt: period?.end ?? null,
        registrationClosesAt: null,
        submissionDueAt: period?.end ?? null,
        judgingAt: null,
        prizeAmount: prize.amount,
        prizeCurrency: prize.currency,
        teamSizeMax: null,
        eligibility: null,
        prizeTracks: [],
        themes: h.themes.map((t) => plainText(t.name)),
      };
    });
}

export async function fetchDevpost(): Promise<ScrapedHackathon[]> {
  const out: ScrapedHackathon[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = (await (await get(`${LIST}&page=${page}`)).json()) as DevpostPage;
    out.push(...parseDevpost(data));
    if (page * data.meta.per_page >= data.meta.total_count || data.hackathons.length === 0) break;
  }
  return out;
}
