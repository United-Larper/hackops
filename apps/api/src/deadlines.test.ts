import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma.service";
import { signedIn, TESTER } from "../test/auth";

let app: INestApplication;
let db: PrismaService;
let http: Awaited<ReturnType<typeof signedIn>>["http"];

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = await mod.createNestApplication().init();
  db = app.get(PrismaService);
  http = (await signedIn(app, db)).http;
  await db.task.deleteMany();
  await db.hackathon.deleteMany();
});
afterAll(() => app.close());

describe("GET /deadlines", () => {
  it("returns in-scope items in the window with their group", async () => {
    const soon = new Date(Date.now() + 3 * 86_400_000);
    const h = await db.hackathon.create({ data: { source: "my-list", title: "Soon Hack", url: "https://example.com", mode: "online", stage: "registered", submissionDueAt: soon } });
    await db.hackathon.create({ data: { source: "my-list", title: "Scraped", url: "https://example.com/2", mode: "online", stage: "discovered", submissionDueAt: soon } });
    await db.task.create({ data: { hackathonId: h.id, title: "Record demo", dueAt: soon } });

    const items = (await http().get("/deadlines?days=7").expect(200)).body;
    const ids = items.map((i: { id: string }) => i.id);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining([`${h.id}:submission`, expect.stringMatching(/^task:/)]));
    expect(items[0]).toMatchObject({ hackathon: "Soon Hack", group: "week" });
    expect((await http().get("/deadlines?days=1").expect(200)).body).toEqual([]); // the window comes from ?days
  });

  it("serves every in-scope deadline as a calendar feed, past ones included", async () => {
    await db.task.deleteMany();
    await db.hackathon.deleteMany();
    const lastWeek = new Date(Date.now() - 7 * 86_400_000);
    const h = await db.hackathon.create({ data: { source: "my-list", title: "Done Hack", url: "https://example.com", mode: "online", stage: "submitted", judgingAt: lastWeek } });
    await db.hackathon.create({ data: { source: "my-list", title: "Scraped", url: "https://example.com/2", mode: "online", stage: "discovered", submissionDueAt: lastWeek } });

    await request(app.getHttpServer()).get("/calendar.ics").expect(404); // public, so it needs a member's token
    await request(app.getHttpServer()).get("/calendar.ics?token=not-a-real-token-at-all").expect(404);
    const { fillToken } = (await http().post("/auth/fill-token").expect(201)).body as { fillToken: string };
    const res = await request(app.getHttpServer()).get(`/calendar.ics?token=${fillToken}`).expect(200);
    expect(res.headers["content-type"]).toMatch(/^text\/calendar/);
    expect(res.text).toContain(`UID:${h.id}:judging@hackops`);
    expect(res.text).not.toContain("Scraped");
  });

  it("rejects a bad window", async () => {
    await http().get("/deadlines?days=0").expect(400);
    await http().get("/deadlines?days=abc").expect(400);
  });
});
