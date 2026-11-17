import { regionOf } from "./enums";

// Fit score (spec §7): 0 to 100 with the reasons shown next to it. Weights are the constants below.

export const FIT_WEIGHTS = {
  base: 10,
  perCategory: 25,
  categoryCap: 45,
  prize: [
    [50_000, 20],
    [10_000, 14],
    [2_000, 8],
    [1, 4],
  ] as [number, number][],
  reach: { online: 25, homeCity: 25, malaysia: 20, overseasHybrid: 15, overseas: 5 },
  closingSoonHours: 48,
  closingSoonPenalty: 10,
  teamTooBigPenalty: 15,
};

// ponytail: rough fixed rates, for ranking prizes only (no money is shown converted). Update if they drift far.
const TO_MYR: Record<string, number> = { MYR: 1, USD: 4.4, SGD: 3.4, EUR: 4.8, GBP: 5.6, CAD: 3.2, AUD: 2.9, JPY: 0.03, INR: 0.05, IDR: 0.00028, THB: 0.13, PHP: 0.076, VND: 0.00017 };

export type FitInput = {
  mode: string;
  city: string | null;
  country: string | null;
  categories: { slug: string; name: string }[];
  prizeAmount: number | null;
  prizeCurrency: string | null;
  registrationClosesAt: Date | string | null;
  submissionDueAt: Date | string | null;
  teamSizeMax: number | null;
};
export type FitTeam = { preferredCats: string[]; homeCity: string; size: number };
export type Fit = { score: number; reasons: string[] };

export function prizeInMyr(amount: number | null, currency: string | null) {
  if (!amount) return 0;
  return amount * (TO_MYR[(currency ?? "USD").toUpperCase()] ?? 1);
}

export function fitScore(h: FitInput, team: FitTeam, now = new Date()): Fit {
  const W = FIT_WEIGHTS;
  const next = h.registrationClosesAt ?? h.submissionDueAt;
  if (next && new Date(next) <= now) return { score: 0, reasons: ["Closed"] };

  let score = W.base;
  const reasons: string[] = [];

  const matches = h.categories.filter((c) => team.preferredCats.includes(c.slug));
  if (matches.length) {
    score += Math.min(W.categoryCap, matches.length * W.perCategory);
    reasons.push(`Matches ${matches.map((c) => c.name).join(", ")}`);
  }

  const myr = prizeInMyr(h.prizeAmount, h.prizeCurrency);
  const prizePoints = W.prize.find(([min]) => myr >= min)?.[1] ?? 0;
  if (prizePoints) {
    score += prizePoints;
    if (prizePoints >= 14) reasons.push("Big prize pool");
  }

  const region = regionOf(h);
  const home = h.city?.trim().toLowerCase() === team.homeCity.trim().toLowerCase();
  if (region === "online") {
    score += W.reach.online;
    reasons.push("Online");
  } else if (region === "malaysia") {
    score += home ? W.reach.homeCity : W.reach.malaysia;
    reasons.push(home ? `In ${h.city}` : "In Malaysia");
  } else {
    score += h.mode === "hybrid" ? W.reach.overseasHybrid : W.reach.overseas;
    reasons.push(h.mode === "hybrid" ? "Overseas, can join remotely" : "Overseas, travel needed");
  }

  if (next && new Date(next).getTime() - now.getTime() < W.closingSoonHours * 3_600_000) {
    score -= W.closingSoonPenalty;
    reasons.push("Closes within 2 days");
  }
  if (h.teamSizeMax && h.teamSizeMax < team.size) {
    score -= W.teamTooBigPenalty;
    reasons.push(`Team cap ${h.teamSizeMax}, you have ${team.size}`);
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}
