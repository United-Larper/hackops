import { readFileSync } from "node:fs";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { TASK_TEMPLATE } from "@hackops/shared";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma.service";
import { signedIn, TESTER } from "../../test/auth";
import { isDevpost, parseGallery, parsePrizes, parseProject } from "./past-winners";
import { get } from "../discovery/http";
import { checkSubmission, guardedLookup, pointsInward } from "./submission-check";

// No real DNS in tests: "intranet.test" lives on a private address, every other host on a public one.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => [{ address: host === "intranet.test" ? "10.1.2.3" : "93.184.216.34", family: 4 }]),
}));

const fixture = (name: string) => readFileSync(`test/fixtures/${name}`, "utf8");

/** A fake fetch answering by URL; anything unlisted fails like a dead host. */
const answer = (routes: Record<string, () => Response>) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const hit = Object.entries(routes).find(([prefix]) => String(url).startsWith(prefix));
      if (!hit) throw new TypeError("fetch failed");
      return hit[1]();
    }),
  );
afterEach(() => vi.unstubAllGlobals());

describe("Devpost past winners and prizes", () => {
  it("won't follow a redirect off the source's site", async () => {
    const redirected = (to: string) => {
      const res = new Response("{}");
      Object.defineProperty(res, "url", { value: to });
      return res;
    };
    vi.stubGlobal("fetch", vi.fn(async () => redirected("https://evil.example/")));
    await expect(get("https://devpost.com/api/hackathons")).rejects.toThrow(/redirected off its site/);
    vi.stubGlobal("fetch", vi.fn(async () => redirected("https://kiroween.devpost.com/")));
    await expect(get("https://devpost.com/api/hackathons")).resolves.toBeInstanceOf(Response);
  });

  it("reads the winners of a saved gallery page", () => {
    const tiles = parseGallery(fixture("devpost-gallery.html"));
    expect(tiles).toHaveLength(24);
    expect(tiles[0]).toEqual({ url: "https://devpost.com/software/upload-drive-in", teamSize: 1 });
    expect(tiles.every((t) => t.teamSize >= 1)).toBe(true);
  });

  it("stops at the first tile that isn't a winner", () => {
    const tile = (winner: boolean, slug: string) =>
      `<div class="large-4 small-12 columns gallery-item"><a href="https://devpost.com/software/${slug}">${winner ? '<img class="winner">' : ""}` +
      `<div class="small members"><img class="user-photo a"><img class="user-photo"></div></a><div class="counts">`;
    expect(parseGallery(tile(true, "a") + tile(false, "b") + tile(true, "c"))).toEqual([{ url: "https://devpost.com/software/a", teamSize: 2 }]);
  });

  it("reads a project's built-with tags and video", () => {
    expect(parseProject(fixture("devpost-project.html"))).toEqual({ tech: ["css", "html", "javascript", "laravel", "php"], hasVideo: true });
    expect(parseProject('<div id="built-with"><ul><li><span class="cp-tag">python</span></li></ul></div>')).toEqual({ tech: ["python"], hasVideo: false });
  });

  it("reads an event's prize tracks", () => {
    const prizes = parsePrizes(fixture("devpost-event.html"));
    expect(prizes).toHaveLength(17);
    expect(prizes[0]).toEqual({ name: "1st Place", prize: "$30,000 in cash", description: null });
    expect(prizes.find((p) => p.name === "Bonus Blog Prize")?.description).toMatch(/^2,000 bonus Kiro credits/);
  });

  it("only fetches Devpost pages", () => {
    expect(isDevpost("https://kiroween.devpost.com/")).toBe(true);
    expect(isDevpost("https://devpost.com.evil.example/")).toBe(false);
    expect(isDevpost("http://kiroween.devpost.com/")).toBe(false);
  });
});

describe("pre-submission check", () => {
  const DONE = TASK_TEMPLATE.map((t) => ({ title: t.title, status: t.title === "Submit" ? "todo" : "done" }));
  const project = { repoUrl: "https://github.com/team/app", demoUrl: "https://app.example.com", videoUrl: "https://youtu.be/abc" };
  const ok = (body = "", status = 200) => () => new Response(body, { status });
  const byKey = (items: { key: string; ok: boolean | null; detail: string }[]) => Object.fromEntries(items.map((i) => [i.key, i.ok]));

  it("passes when the repo is public with a README, both links respond, the checklist is done and a track is chosen", async () => {
    answer({
      "https://api.github.com/repos/team/app/readme": ok("x".repeat(301)),
      "https://api.github.com/repos/team/app": ok(JSON.stringify({ private: false })),
      "https://youtu.be/": ok("", 303),
      "https://app.example.com": ok(),
    });
    const items = await checkSubmission({ project, tasks: DONE, prizeTracks: [{ entering: true }] });
    expect(items.map((i) => i.ok)).toEqual([true, true, true, true, true, true]);
  });

  it("fails a missing or private repo, dead links, open tasks and no chosen track", async () => {
    answer({ "https://api.github.com/repos/team/app": ok("", 404), "https://youtu.be/": ok("", 404) });
    const tasks = DONE.map((t) => (t.title === "Write the README" ? { ...t, status: "doing" } : t));
    const items = await checkSubmission({ project, tasks, prizeTracks: [{ entering: false }] });
    expect(byKey(items)).toEqual({ repo: false, readme: false, video: false, demo: false, checklist: false, tracks: false });
    expect(items.find((i) => i.key === "checklist")?.detail).toBe("1 left: Write the README");
    expect(items.find((i) => i.key === "demo")?.detail).toMatch(/Couldn't connect/);

    const none = await checkSubmission({ project: null, tasks: [], prizeTracks: [] });
    expect(none.every((i) => i.ok === false)).toBe(true);
  });

  it("never fetches a link that points into this computer or its network", async () => {
    for (const url of ["http://127.0.0.1:4000/health", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://169.254.169.254/latest", "http://192.168.1.1", "http://intranet.test/admin", "http://[64:ff9b::7f00:1]/", "http://[2002:7f00:1::]/", "http://198.18.0.1/"]) {
      expect(await pointsInward(url)).toBe(true);
    }
    expect(await pointsInward("https://app.example.com")).toBe(false);

    const fetch = vi.fn(async () => new Response(""));
    vi.stubGlobal("fetch", fetch);
    const items = await checkSubmission({ project: { repoUrl: null, demoUrl: "http://intranet.test/admin", videoUrl: "http://169.254.169.254/" }, tasks: [], prizeTracks: [] });
    expect(items.find((i) => i.key === "demo")).toMatchObject({ ok: false, detail: expect.stringMatching(/private address/) });
    expect(items.find((i) => i.key === "video")).toMatchObject({ ok: false, detail: expect.stringMatching(/private address/) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a private address at connect time too, so a name can't switch answers after the check", async () => {
    const connect = (host: string) => new Promise<unknown>((resolve) => guardedLookup(host, {}, (err, address) => resolve(err ? (err as NodeJS.ErrnoException).code : address)));
    expect(await connect("intranet.test")).toBe("EPRIVATE");
    expect(await connect("app.example.com")).toBe("93.184.216.34");
  });

  it("says a slow link timed out, and a dead one couldn't connect", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("slow")) throw new DOMException("The operation timed out.", "TimeoutError");
      throw new TypeError("fetch failed");
    }));
    const items = await checkSubmission({ project: { repoUrl: null, demoUrl: "https://slow.example.com", videoUrl: "https://dead.example.com" }, tasks: [], prizeTracks: [] });
    expect(items.find((i) => i.key === "demo")?.detail).toMatch(/within 10 seconds/);
    expect(items.find((i) => i.key === "video")?.detail).toMatch(/Couldn't connect/);
  });

  it("fails a short README, and can't tell for a repo off GitHub or when GitHub's limit is hit", async () => {
    answer({
      "https://api.github.com/repos/team/app/readme": ok("# app"),
      "https://api.github.com/repos/team/app": ok(JSON.stringify({ private: false })),
      "https://api.github.com/repos/team/busy": ok("", 403),
    });
    expect(byKey(await checkSubmission({ project, tasks: DONE, prizeTracks: [] }))).toMatchObject({ repo: true, readme: false });
    const gitlab = await checkSubmission({ project: { ...project, repoUrl: "https://gitlab.com/team/app" }, tasks: DONE, prizeTracks: [] });
    expect(byKey(gitlab)).toMatchObject({ repo: null, readme: null });
    const busy = await checkSubmission({ project: { ...project, repoUrl: "https://github.com/team/busy" }, tasks: DONE, prizeTracks: [] });
    expect(busy[0]).toMatchObject({ ok: null, detail: expect.stringMatching(/hourly limit/) });
  });
});

describe("intel endpoints", () => {
  let app: INestApplication;
  let db: PrismaService;
  let http: Awaited<ReturnType<typeof signedIn>>["http"];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = await mod.createNestApplication().init();
    db = app.get(PrismaService);
    http = (await signedIn(app, db)).http;
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await db.activity.deleteMany();
    await db.task.deleteMany();
    await db.hackathon.deleteMany();
  });

  const devpost = (over: object = {}) =>
    db.hackathon.create({
      data: { source: "devpost", sourceId: "31667", title: "Kiroween 2026", url: "https://kiroween.devpost.com/", mode: "online", organizer: "Kiro", ...over },
    });

  it("imports Devpost prize tracks, keeping a typed track's text and entering mark", async () => {
    const h = await devpost({ prizeTracks: JSON.stringify([{ name: "Best Demo", description: "Our note", entering: true }]) });
    answer({ "https://kiroween.devpost.com/": () => new Response(fixture("devpost-event.html")) });
    const ws = (await http().post(`/hackathons/${h.id}/tracks/import`).expect(200)).body;
    expect(ws.prizeTracks).toHaveLength(17);
    expect(ws.prizeTracks.filter((t: { name: string }) => t.name === "Best Demo")).toEqual([
      { name: "Best Demo", description: "Our note", entering: true, fit: "no" },
    ]);
    expect(ws.prizeTracks[1]).toMatchObject({ name: "1st Place", entering: false, fit: "maybe" });
    expect(ws.activity[0].text).toBe("Imported 16 prize tracks from Devpost");
  });

  it("has no past data and no import for events not on Devpost", async () => {
    const h = await devpost({ source: "mlh", sourceId: "x", url: "https://example.com" });
    expect((await http().get(`/hackathons/${h.id}/winners`).expect(200)).body).toEqual({ organizer: "Kiro", brief: null });
    await http().post(`/hackathons/${h.id}/tracks/import`).expect(400);
  });

  it("lists a failing check in the due-soon panel", async () => {
    const h = await devpost({ stage: "building", submissionDueAt: new Date(Date.now() + 3 * 3_600_000) });
    answer({});
    const check = (await http().get(`/hackathons/${h.id}/check`).expect(200)).body;
    expect(check.items.some((i: { ok: boolean }) => i.ok === false)).toBe(true);
    const due = (await http().get("/deadlines?days=7").expect(200)).body;
    expect(due.map((d: { id: string }) => d.id)).toContain(`${h.id}:check`);
  });
});
