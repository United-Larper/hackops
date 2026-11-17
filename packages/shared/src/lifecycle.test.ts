import { describe, expect, it } from "vitest";
import { STAGES, phaseOf } from "./lifecycle";

describe("phaseOf", () => {
  it("maps every stage", () => {
    expect(STAGES.map(phaseOf)).toEqual([
      "initiation", "initiation", "planning", "execution", "closing", "closing", null,
    ]);
  });
});
