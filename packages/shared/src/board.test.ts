import { describe, expect, it } from "vitest";
import { nextDeadline, progressOf } from "./board";

const now = new Date("2030-01-01T00:00:00Z");
const h = {
  registrationClosesAt: "2030-01-03T00:00:00Z",
  submissionDueAt: "2030-01-10T00:00:00Z",
  judgingAt: "2030-01-20T00:00:00Z",
};

describe("progressOf", () => {
  it("counts done tasks out of all", () => {
    expect(progressOf([{ status: "done" }, { status: "doing" }, { status: "todo" }, { status: "done" }])).toEqual({ done: 2, total: 4 });
    expect(progressOf([])).toEqual({ done: 0, total: 0 });
  });
});

describe("nextDeadline", () => {
  it("picks the stage's earliest future deadline", () => {
    expect(nextDeadline({ ...h, stage: "interested" }, now)).toEqual({ kind: "registration", at: "2030-01-03T00:00:00.000Z" });
    expect(nextDeadline({ ...h, stage: "building" }, now)).toEqual({ kind: "submission", at: "2030-01-10T00:00:00.000Z" });
    expect(nextDeadline({ ...h, stage: "submitted" }, now)).toEqual({ kind: "judging", at: "2030-01-20T00:00:00.000Z" });
  });

  it("skips passed deadlines and ends at results", () => {
    const later = new Date("2030-01-05T00:00:00Z");
    expect(nextDeadline({ ...h, stage: "interested" }, later)).toEqual({ kind: "submission", at: "2030-01-10T00:00:00.000Z" });
    expect(nextDeadline({ ...h, stage: "results" }, now)).toBeNull();
    expect(nextDeadline({ registrationClosesAt: null, submissionDueAt: null, judgingAt: null, stage: "registered" }, now)).toBeNull();
  });
});
