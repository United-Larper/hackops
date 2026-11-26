// "What wins here" (phase 10): past winners of the same organizer, boiled down to one line.

/** One winning project from a past edition, as read from its Devpost page. */
export type PastWinner = { tech: string[]; teamSize: number; hasVideo: boolean };

export type WinnersBrief = {
  editions: number;
  winners: number;
  /** The most-used "built with" tags, most first (up to three). */
  topTech: string[];
  /** Rounded to a whole person; null when no winner listed a team. */
  avgTeam: number | null;
  withVideo: number;
};

export function summariseWinners(winners: PastWinner[], editions: number): WinnersBrief {
  const count = new Map<string, number>();
  for (const w of winners) for (const t of new Set(w.tech.map((x) => x.trim().toLowerCase()).filter(Boolean))) count.set(t, (count.get(t) ?? 0) + 1);
  const topTech = [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([t]) => t);
  const teams = winners.filter((w) => w.teamSize > 0);
  return {
    editions,
    winners: winners.length,
    topTech,
    avgTeam: teams.length ? Math.round(teams.reduce((s, w) => s + w.teamSize, 0) / teams.length) : null,
    withVideo: winners.filter((w) => w.hasVideo).length,
  };
}

/** "Past winners mostly used: python, openai, react · average team of 3 · 4 of 6 had a demo video", or null with no winners. */
export function briefLine(b: WinnersBrief): string | null {
  if (!b.winners) return null;
  return [
    b.topTech.length ? `Past winners mostly used: ${b.topTech.join(", ")}` : "Past winners listed no tech",
    b.avgTeam ? `average team of ${b.avgTeam}` : null,
    `${b.withVideo} of ${b.winners} had a demo video`,
  ]
    .filter(Boolean)
    .join(" · ");
}
