import { describe, expect, it } from "vitest";
import type { DueItem } from "./deadlines";
import { toIcs } from "./ics";

const now = new Date("2030-03-10T08:00:00Z");
const item = (over: Partial<DueItem> = {}): DueItem => ({
  id: "h1:submission", kind: "submission", at: "2030-03-12T09:30:00Z", hackathonId: "h1", hackathon: "Penang Health Hack", task: null, ...over,
});
const lines = (ics: string) => ics.split("\r\n");
const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const bytes = (s: string) => new TextEncoder().encode(s).length;

describe("toIcs", () => {
  it("writes one UTC event with a stable UID and three alarms, all lines ending in CRLF", () => {
    const ics = toIcs([item()], now);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/); // no bare CR or LF anywhere
    expect(lines(ics)).toEqual(expect.arrayContaining([
      "BEGIN:VEVENT", "UID:h1:submission@hackops", "DTSTAMP:20300310T080000Z", "DTSTART:20300312T093000Z",
      "SUMMARY:Submission due · Penang Health Hack", "TRIGGER:-P7D", "TRIGGER:-P2D", "TRIGGER:-PT3H", "END:VEVENT",
    ]));
    expect(lines(ics).filter((l) => l === "BEGIN:VALARM")).toHaveLength(3);
  });

  it("names tasks with their hackathon", () => {
    expect(lines(toIcs([item({ id: "task:t1", kind: "task", task: "Build the MVP" })], now))).toContain("SUMMARY:Task: Build the MVP · Penang Health Hack");
  });

  it("escapes backslashes, semicolons, commas and newlines", () => {
    const ics = unfold(toIcs([item({ hackathon: "Hack, Build; Ship\\ It\nnow\rthen" })], now));
    expect(lines(ics)).toContain("SUMMARY:Submission due · Hack\\, Build\\; Ship\\\\ It\\nnow\\nthen");
  });

  it("folds long lines to 75 octets and unfolding restores them", () => {
    const long = "x".repeat(200);
    const ics = toIcs([item({ hackathon: long })], now);
    for (const l of lines(ics)) expect(bytes(l)).toBeLessThanOrEqual(75);
    expect(lines(unfold(ics))).toContain(`SUMMARY:Submission due · ${long}`);
  });

  it("never splits a multibyte character at a fold", () => {
    const title = "🏆".repeat(60); // 4 octets each, so folds land mid-character unless handled
    const ics = toIcs([item({ hackathon: title })], now);
    for (const l of lines(ics)) {
      expect(bytes(l)).toBeLessThanOrEqual(75);
      expect(l).not.toMatch(/[\uD800-\uDBFF]$|^ ?[\uDC00-\uDFFF]/); // no lone surrogate halves at the edges
    }
    expect(lines(unfold(ics))).toContain(`SUMMARY:Submission due · ${title}`);
  });

  it("is a valid empty calendar when nothing is in scope", () => {
    const ics = toIcs([], now);
    expect(lines(ics)[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR\r\n");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
