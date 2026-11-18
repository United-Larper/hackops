import { describe, expect, it } from "vitest";
import { upcomingDeadlines } from "./deadlines";

const H = 3_600_000;
const now = new Date("2030-03-10T15:30:00Z"); // 23:30 MYT, Sun 10 Mar
const inH = (h: number) => new Date(now.getTime() + h * H).toISOString();
const hack = (id: string, stage: string, dates: { reg?: string; sub?: string; judge?: string } = {}) => ({
  id, title: id, stage, registrationClosesAt: dates.reg ?? null, submissionDueAt: dates.sub ?? null, judgingAt: dates.judge ?? null,
});
const task = (id: string, hackathonId: string, dueAt: string | null, status = "todo") => ({ id, title: id, status, dueAt, hackathonId });
const ids = (hs: ReturnType<typeof hack>[], ts: ReturnType<typeof task>[] = [], days = 7) => upcomingDeadlines(hs, ts, now, days).map((i) => i.id);

describe("upcomingDeadlines", () => {
  it("lists an Interested event's registration close in 3 days under This week", () => {
    expect(upcomingDeadlines([hack("a", "interested", { reg: inH(72) })], [], now, 7)).toMatchObject([
      { id: "a:registration", kind: "registration", group: "week", hackathon: "a", task: null },
    ]);
  });

  it("groups by MYT day, not UTC day", () => {
    // 00:30 MYT Monday is still Sunday in UTC.
    const [i] = upcomingDeadlines([hack("a", "registered", { sub: inH(1) })], [], now, 7);
    expect(i.group).toBe("tomorrow");
    const [j] = upcomingDeadlines([hack("b", "registered", { sub: inH(0.25) })], [], now, 7);
    expect(j.group).toBe("today");
  });

  it("skips passed deadlines and ones beyond the window", () => {
    expect(ids([hack("a", "building", { sub: inH(-1) }), hack("b", "building", { sub: inH(8 * 24) })])).toEqual([]);
  });

  it("watches only the deadlines that matter at each board stage", () => {
    const all = { reg: inH(2), sub: inH(3), judge: inH(4) };
    expect(ids(["discovered", "interested", "registered", "submitted", "results", "skipped"].map((s) => hack(s, s, all)))).toEqual([
      "interested:registration", "interested:submission", "registered:submission", "submitted:judging",
    ]);
  });

  it("lists open dated tasks on Registered and Building hackathons only", () => {
    const hs = [hack("r", "registered"), hack("i", "interested")];
    const ts = [task("open", "r", inH(5)), task("done", "r", inH(5), "done"), task("undated", "r", null), task("early", "i", inH(5))];
    expect(ids(hs, ts)).toEqual(["task:open"]);
  });

  it("sorts soonest first across hackathons and tasks", () => {
    expect(ids([hack("a", "building", { sub: inH(30) })], [task("t", "a", inH(2))])).toEqual(["task:t", "a:submission"]);
  });
});
