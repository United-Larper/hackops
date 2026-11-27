import { describe, expect, it } from "vitest";
import { TASK_TEMPLATE, templateTasks } from "./task-template";
import { regionOf } from "./enums";
import { TeamAssignmentsInput } from "./schemas";

describe("templateTasks", () => {
  const now = new Date("2026-11-17T00:00:00Z");

  it("counts due dates back from submission", () => {
    const due = new Date("2026-11-25T07:00:00Z");
    const tasks = templateTasks(due, now);
    expect(tasks).toHaveLength(TASK_TEMPLATE.length);
    expect(tasks.at(-1)).toEqual({ title: "Submit", order: TASK_TEMPLATE.length - 1, dueAt: new Date("2026-11-25T06:00:00Z") });
  });

  it("clamps past due dates to now and leaves dates empty without a deadline", () => {
    const soon = new Date("2026-11-17T10:00:00Z"); // 10h away: the 72h/60h/48h/12h tasks would be in the past
    expect(templateTasks(soon, now)[0].dueAt).toEqual(now);
    expect(templateTasks(null, now).every((t) => t.dueAt === null)).toBe(true);
  });
});

describe("regionOf", () => {
  it("separates online, Malaysia and overseas", () => {
    expect(regionOf({ mode: "online", country: "Malaysia" })).toBe("online");
    expect(regionOf({ mode: "hybrid", country: " malaysia " })).toBe("malaysia");
    expect(regionOf({ mode: "in_person", country: "Singapore" })).toBe("overseas");
    expect(regionOf({ mode: "in_person", country: null })).toBe("overseas");
  });
});

describe("TeamAssignmentsInput", () => {
  it("refuses a member twice", () => {
    const ok = [{ memberId: "a", role: "lead" }, { memberId: "b", role: "developer" }];
    expect(TeamAssignmentsInput.safeParse(ok).success).toBe(true);
    expect(TeamAssignmentsInput.safeParse([]).success).toBe(true);
    expect(TeamAssignmentsInput.safeParse([...ok, { memberId: "a", role: "pitch" }]).success).toBe(false);
  });
});
