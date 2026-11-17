import { describe, expect, it } from "vitest";
import { skillGaps } from "./skills";

describe("skillGaps", () => {
  it("lists missing roles and the category needs nobody covers", () => {
    const team = [
      { role: "lead" as const, skills: ["React", "TypeScript"] },
      { role: "developer" as const, skills: ["Flutter", "ML Kit"] },
    ];
    expect(skillGaps(["ai-ml", "healthtech", "web3"], team)).toEqual({
      roles: ["designer", "pitch"],
      skills: [{ category: "web3", need: "Smart contracts" }],
    });
  });

  it("matches whole words only, ignoring case", () => {
    const html = [{ role: "developer" as const, skills: ["HTML", "css"] }];
    expect(skillGaps(["ai-ml"], html).skills).toEqual([{ category: "ai-ml", need: "Machine learning" }]);
    expect(skillGaps(["ai-ml"], [{ role: "developer" as const, skills: ["python"] }]).skills).toEqual([]);
  });

  it("an empty team misses every role; categories without a mapped need add nothing", () => {
    expect(skillGaps(["open", "student"], [])).toEqual({ roles: ["lead", "developer", "designer", "pitch"], skills: [] });
  });
});
