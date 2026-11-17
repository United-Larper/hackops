import { describe, expect, it } from "vitest";
import { categorise, isSameEvent, normaliseTitle } from "./discovery";
import { fitScore, type FitInput } from "./fit";

describe("dedupe", () => {
  it("normalises titles and matches the same event across sources", () => {
    expect(normaliseTitle("HackKL 2026: AI Edition!")).toBe("hackkl ai edition");
    expect(isSameEvent({ title: "Hack KL 2026", startsAt: "2026-12-01T00:00:00Z" }, { title: "hack-kl", startsAt: "2026-12-02T09:00:00Z" })).toBe(true);
    expect(isSameEvent({ title: "Hack KL", startsAt: "2026-12-01T00:00:00Z" }, { title: "Hack KL", startsAt: "2027-03-01T00:00:00Z" })).toBe(false);
    expect(isSameEvent({ title: "Hack KL" }, { title: "Hack KL", startsAt: "2026-12-01T00:00:00Z" })).toBe(false);
    expect(isSameEvent({ title: "Hack KL" }, { title: "Hack Penang" })).toBe(false);
  });
});

describe("categorise", () => {
  const cats = [
    { slug: "ai-ml", keywords: ["ai", "machine learning"] },
    { slug: "fintech", keywords: ["fintech", "payments"] },
    { slug: "student", keywords: ["student"] },
  ];
  it("matches whole words only", () => {
    expect(categorise("Machine Learning/AI · Beginner Friendly", cats)).toEqual(["ai-ml"]);
    expect(categorise("Payments & Student builders", cats)).toEqual(["fintech", "student"]);
    expect(categorise("Rainforest air quality", cats)).toEqual([]); // "ai" inside "rainforest"/"air" is not a match
  });
});

describe("fitScore", () => {
  const now = new Date("2026-11-17T00:00:00Z");
  const team = { preferredCats: ["ai-ml"], homeCity: "Kuala Lumpur", size: 4 };
  const ai = [{ slug: "ai-ml", name: "AI / ML" }];
  const base: FitInput = {
    mode: "online", city: null, country: null, categories: ai, prizeAmount: 20000, prizeCurrency: "USD",
    registrationClosesAt: "2026-12-01T00:00:00Z", submissionDueAt: null, teamSizeMax: 4,
  };

  it("scores 0 once registration has closed", () => {
    expect(fitScore({ ...base, registrationClosesAt: "2026-11-16T00:00:00Z" }, team, now)).toEqual({ score: 0, reasons: ["Closed"] });
  });

  it("scores an online AI event with a big prize high, with reasons", () => {
    const fit = fitScore(base, team, now);
    expect(fit.score).toBeGreaterThanOrEqual(75);
    expect(fit.reasons).toEqual(["Matches AI / ML", "Big prize pool", "Online"]);
  });

  it("ranks the same event in KL above overseas in person", () => {
    const kl = fitScore({ ...base, mode: "in_person", city: "Kuala Lumpur", country: "Malaysia" }, team, now);
    const tokyo = fitScore({ ...base, mode: "in_person", city: "Tokyo", country: "Japan" }, team, now);
    expect(kl.score).toBeGreaterThan(tokyo.score);
    expect(tokyo.reasons).toContain("Overseas, travel needed");
  });

  it("penalises closing within two days and a team cap below the team size", () => {
    const tight = fitScore({ ...base, registrationClosesAt: "2026-11-18T00:00:00Z", teamSizeMax: 3 }, team, now);
    expect(tight.score).toBe(fitScore(base, team, now).score - 25);
    expect(tight.reasons).toEqual(expect.arrayContaining(["Closes within 2 days", "Team cap 3, you have 4"]));
  });
});
