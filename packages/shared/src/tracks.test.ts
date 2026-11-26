import { describe, expect, it } from "vitest";
import { trackFit } from "./tracks";

const tech = ["Python", "OpenAI", "Next.js"];
const cats = ["AI / ML", "machine learning", "llm"];

describe("trackFit", () => {
  it("fits when the track names the project's tech", () => {
    expect(trackFit({ name: "Best use of OpenAI" }, tech, cats)).toBe("fits");
    expect(trackFit({ name: "Frontend prize", description: "Built on Next.js with a live demo" }, tech, cats)).toBe("fits");
  });

  it("is a maybe on a category keyword or a placement prize", () => {
    expect(trackFit({ name: "Best LLM app" }, tech, cats)).toBe("maybe");
    expect(trackFit({ name: "1st Place" }, tech, cats)).toBe("maybe");
  });

  it("is a no otherwise, and doesn't match inside words", () => {
    expect(trackFit({ name: "Best Solana dApp", sponsor: "Solana Foundation" }, tech, cats)).toBe("no");
    expect(trackFit({ name: "Pythonista award" }, tech, cats)).toBe("no");
  });
});
