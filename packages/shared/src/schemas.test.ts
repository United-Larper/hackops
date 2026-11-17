import { describe, expect, it } from "vitest";
import { HackathonPatch, MemberPatch, ProjectPatch, TaskPatch } from "./schemas";

// A PATCH must only carry the fields sent; a filled-in default would overwrite stored data.
describe("patch schemas", () => {
  it("don't fill in defaults for fields that weren't sent", () => {
    expect(HackathonPatch.parse({ decisionNote: "Go" })).toEqual({ decisionNote: "Go" });
    expect(TaskPatch.parse({ title: "Deck" })).toEqual({ title: "Deck" });
    expect(ProjectPatch.parse({ name: "LearnLah" })).toEqual({ name: "LearnLah" });
    expect(MemberPatch.parse({ name: "Aina" })).toEqual({ name: "Aina" });
  });

  it("still validate the fields that were sent", () => {
    expect(TaskPatch.safeParse({ status: "nope" }).success).toBe(false);
    expect(HackathonPatch.parse({ categories: ["ai-ml"] })).toEqual({ categories: ["ai-ml"] });
  });
});
