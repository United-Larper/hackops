import { describe, expect, it } from "vitest";
import { briefLine, summariseWinners } from "./winners";

describe("summariseWinners", () => {
  it("counts tech once per project, averages team size and counts videos", () => {
    const b = summariseWinners(
      [
        { tech: ["Python", "python", "OpenAI", "React"], teamSize: 3, hasVideo: true },
        { tech: ["python", "react"], teamSize: 4, hasVideo: true },
        { tech: ["openai", "flask"], teamSize: 2, hasVideo: false },
        { tech: ["python"], teamSize: 0, hasVideo: true },
      ],
      2,
    );
    expect(b).toEqual({ editions: 2, winners: 4, topTech: ["python", "openai", "react"], avgTeam: 3, withVideo: 3 });
    expect(briefLine(b)).toBe("Past winners mostly used: python, openai, react · average team of 3 · 3 of 4 had a demo video");
  });

  it("has no line without winners", () => {
    expect(briefLine(summariseWinners([], 0))).toBeNull();
  });
});
