import { readFileSync } from "node:fs";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import type { ScrapedHackathon } from "@hackops/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma.service";
import { signedIn, TESTER } from "../../test/auth";
import { parseDevpost, parsePeriod, parsePrize } from "./devpost";
import { currentSeason, parseMlh } from "./mlh";
import { DiscoveryService } from "./refresh";

const fixture = (name: string) => readFileSync(`test/fixtures/${name}`, "utf8");

describe("Devpost parsing", () => {
  it("reads the three date formats", () => {
    expect(parsePeriod("Oct 30 - Dec 04, 2026")).toEqual({ start: new Date("2026-10-30T00:00:00Z"), end: new Date("2026-12-05T04:59:00Z") });
    expect(parsePeriod("Nov 11 - 30, 2026")?.end).toEqual(new Date("2026-12-01T04:59:00Z"));
    expect(parsePeriod("Nov 11, 2026 - Jan 11, 2027")?.start).toEqual(new Date("2026-11-11T00:00:00Z"));
    expect(parsePeriod("Dec 20 - Jan 05, 2027")?.start).toEqual(new Date("2026-12-20T00:00:00Z"));
    expect(parsePeriod("Rolling")).toBeNull();
  });

  it("reads prizes and currencies", () => {
    expect(parsePrize('$<span data-currency-value>100,000</span>')).toEqual({ amount: 100000, currency: "USD" });
    expect(parsePrize("$CAD 1,050")).toEqual({ amount: 1050, currency: "CAD" });
    expect(parsePrize("€1,000")).toEqual({ amount: 1000, currency: "EUR" });
    expect(parsePrize("₹ 500,000")).toEqual({ amount: 500000, currency: "INR" });
    expect(parsePrize("$0")).toEqual({ amount: null, currency: null });
  });

  it("parses the saved listing", () => {
    const items = parseDevpost(JSON.parse(fixture("devpost.json")));
    expect(items.length).toBe(40);
    const first = items[0];
    expect(first).toMatchObject({ source: "devpost", sourceId: "31667", title: "Kiroween 2026", mode: "online", prizeAmount: 100000, prizeCurrency: "USD" });
    expect(first.themes).toContain("Machine Learning/AI");
    expect(items.every((i) => i.url.startsWith("https://"))).toBe(true);
    expect(items.filter((i) => i.startsAt).length).toBe(40);
  });
});

describe("MLH parsing", () => {
  it("parses the embedded season data", () => {
    const items = parseMlh(fixture("mlh.html"));
    expect(items.length).toBe(24);
    expect(items[0]).toMatchObject({ source: "mlh", sourceId: "hack-western-13", title: "Hack Western 13", mode: "in_person", city: "London", country: "Canada", url: "https://hackwestern.com" });
    expect(items[0].themes).toContain("student");
  });

  it("names seasons by the year they end in", () => {
    expect(currentSeason(new Date("2026-11-17T00:00:00Z"))).toBe(2027);
    expect(currentSeason(new Date("2027-03-01T00:00:00Z"))).toBe(2027);
  });

  it("fails loudly when the page layout changes", () => {
    expect(() => parseMlh("<html></html>")).toThrow(/layout changed/);
  });
});

describe("refresh", () => {
  let app: INestApplication;
  let db: PrismaService;
  let discovery: DiscoveryService;

  const item = (over: Partial<ScrapedHackathon> = {}): ScrapedHackathon => ({
    source: "devpost", sourceId: "1", title: "Agents Hack 2026", url: "https://agents.devpost.com", organizer: "Agents Guild",
    mode: "online", city: null, country: null, startsAt: new Date("2026-12-01T00:00:00Z"), endsAt: new Date("2026-12-10T00:00:00Z"),
    registrationClosesAt: null, submissionDueAt: new Date("2026-12-10T00:00:00Z"), judgingAt: null, prizeAmount: 5000, prizeCurrency: "USD",
    teamSizeMax: null, eligibility: null, prizeTracks: [], themes: ["Machine Learning/AI"], ...over,
  });

  let http: Awaited<ReturnType<typeof signedIn>>["http"];
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = await mod.createNestApplication().init();
    db = app.get(PrismaService);
    discovery = app.get(DiscoveryService);
    http = (await signedIn(app, db)).http;
  });
  afterAll(() => app.close());

  beforeEach(async () => {
    await db.activity.deleteMany();
    await db.task.deleteMany();
    await db.assignment.deleteMany();
    await db.hackathon.deleteMany();
    await db.member.deleteMany({ where: { id: { not: TESTER } } });
    await db.team.deleteMany();
  });

  it("adds new events with categories, and a second run adds nothing", async () => {
    const fetchers = { devpost: async () => [item()] };
    expect((await discovery.refresh(fetchers)).devpost).toMatchObject({ fetched: 1, added: 1 });
    const h = await db.hackathon.findFirstOrThrow({ include: { activity: true } });
    expect(h.stage).toBe("discovered");
    expect(h.categories).toEqual(["ai-ml"]);
    expect(h.activity[0].text).toBe("Found on Devpost");

    expect((await discovery.refresh(fetchers)).devpost).toMatchObject({ added: 0, updated: 1 });
    expect(await db.hackathon.count()).toBe(1);
  });

  it("keeps the team's stage, category and prize-track edits when the source updates", async () => {
    await discovery.refresh({ devpost: async () => [item()] });
    const h = await db.hackathon.findFirstOrThrow();
    const tracks = [{ name: "Best AI", entering: true }];
    await db.hackathon.update({ where: { id: h.id }, data: { stage: "interested", prizeTracks: tracks, categories: ["fintech"] } });
    await discovery.refresh({ devpost: async () => [item({ prizeAmount: 9000 })] });
    const after = await db.hackathon.findFirstOrThrow();
    expect(after).toMatchObject({ stage: "interested", prizeAmount: 9000, prizeTracks: tracks, categories: ["fintech"] });
  });

  it("skips the same event from a second source, rejects unsafe links, and reports a failing source", async () => {
    const report = await discovery.refresh({
      devpost: async () => [item(), item({ sourceId: "2", title: "Bad link", url: "javascript:alert(1)" })],
      mlh: async () => [item({ source: "mlh", sourceId: "agents-hack", title: "Agents Hack", startsAt: new Date("2026-12-02T00:00:00Z") })],
      broken: async () => {
        throw new Error("devpost.com answered 503");
      },
    });
    expect(report.devpost).toMatchObject({ added: 1, invalid: 1 });
    expect(report.mlh).toMatchObject({ added: 0, duplicates: 1 });
    expect(report.broken).toMatchObject({ error: "devpost.com answered 503" });
    expect(await db.hackathon.count()).toBe(1);
  });

  it("sorts by deadline and hides closed events", async () => {
    await discovery.refresh({
      devpost: async () => [
        item({ sourceId: "a", title: "AI Online", submissionDueAt: new Date(Date.now() + 10 * 86_400_000) }),
        item({ sourceId: "b", title: "Generic Hack", themes: [], submissionDueAt: new Date(Date.now() + 5 * 86_400_000) }),
        item({ sourceId: "c", title: "Old Hack", submissionDueAt: new Date(Date.now() - 86_400_000) }),
      ],
    });
    const res = await http().get("/hackathons?stage=discovered&open=1&sort=deadline").expect(200);
    expect(res.body.map((h: { title: string }) => h.title)).toEqual(["Generic Hack", "AI Online"]);
    const soon = await http().get("/hackathons?closesWithin=7").expect(200);
    expect(soon.body.map((h: { title: string }) => h.title)).toEqual(["Generic Hack"]);
  });
});
