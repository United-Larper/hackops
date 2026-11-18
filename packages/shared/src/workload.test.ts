import { describe, expect, it } from "vitest";
import { overlaps, workload } from "./workload";

const span = (startsAt: string | null, endsAt: string | null, submissionDueAt: string | null = null) => ({ startsAt, endsAt, submissionDueAt });

describe("overlaps", () => {
  it("is true when the date ranges share any moment, ends included", () => {
    expect(overlaps(span("2030-01-01", "2030-01-03"), span("2030-01-02", "2030-01-05"))).toBe(true);
    expect(overlaps(span("2030-01-01", "2030-01-03"), span("2030-01-03", "2030-01-05"))).toBe(true);
    expect(overlaps(span("2030-01-01", "2030-01-10"), span("2030-01-04", "2030-01-05"))).toBe(true);
  });

  it("is false for ranges that don't meet", () => {
    expect(overlaps(span("2030-01-01", "2030-01-03"), span("2030-01-04", "2030-01-05"))).toBe(false);
    expect(overlaps(span("2030-01-04", "2030-01-05"), span("2030-01-01", "2030-01-03"))).toBe(false);
  });

  it("falls back to the submission deadline as the end, and a lone date as a one-moment range", () => {
    expect(overlaps(span("2030-01-01", null, "2030-01-05"), span("2030-01-04", "2030-01-06"))).toBe(true);
    expect(overlaps(span(null, null, "2030-01-05"), span("2030-01-04", "2030-01-06"))).toBe(true);
    expect(overlaps(span(null, null, "2030-01-09"), span("2030-01-04", "2030-01-06"))).toBe(false);
  });

  it("is false when either side has no dates at all", () => {
    expect(overlaps(span(null, null), span("2030-01-01", "2030-01-31"))).toBe(false);
  });
});

describe("workload", () => {
  const members = [{ id: "a", name: "Aina" }, { id: "b", name: "Wei Jie" }];
  const h = (id: string, stage: string, dates: ReturnType<typeof span>, team: [string, boolean][]) => ({
    id, stage, ...dates, assignments: team.map(([memberId, accountable]) => ({ memberId, role: "developer" as const, accountable })),
  });
  const hackathons = [
    h("h1", "registered", span("2030-01-01", "2030-01-03"), [["a", true], ["b", false]]),
    h("h2", "building", span("2030-01-02", "2030-01-04"), [["a", false]]),
    h("h3", "building", span("2030-02-01", "2030-02-02"), [["a", true]]),
    h("h4", "submitted", span("2030-01-01", "2030-01-03"), [["b", true]]), // not active
  ];
  const tasks = [
    { hackathonId: "h1", assigneeId: "a", status: "todo" },
    { hackathonId: "h2", assigneeId: "a", status: "doing" },
    { hackathonId: "h2", assigneeId: "a", status: "done" },
    { hackathonId: "h4", assigneeId: "b", status: "todo" }, // on an inactive hackathon
    { hackathonId: "h1", assigneeId: null, status: "todo" },
  ];

  it("counts each member's active hackathons and their open tasks on them", () => {
    const rows = workload(members, hackathons, tasks);
    expect(rows.map((r) => [r.member.id, r.hackathons.map((x) => x.id), r.openTasks])).toEqual([
      ["a", ["h1", "h2", "h3"], 2],
      ["b", ["h1"], 0],
    ]);
    expect(rows[0].hackathons[0]).toEqual({ id: "h1", role: "developer", accountable: true });
  });

  it("lists pairs of a member's active hackathons whose dates overlap", () => {
    const [a, b] = workload(members, hackathons, tasks);
    expect(a.clashes).toEqual([["h1", "h2"]]);
    expect(b.clashes).toEqual([]);
  });
});
