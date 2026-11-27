import { describe, expect, it } from "vitest";
import { categorise, isSameEvent, normaliseTitle } from "./discovery";

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
