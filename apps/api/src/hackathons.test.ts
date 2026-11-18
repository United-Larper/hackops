import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { TASK_TEMPLATE } from "@hackops/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma.service";

let app: INestApplication;
let db: PrismaService;
const http = () => request(app.getHttpServer());

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = await mod.createNestApplication().init();
  db = app.get(PrismaService);
});
afterAll(() => app.close());

beforeEach(async () => {
  await db.activity.deleteMany();
  await db.task.deleteMany();
  await db.assignment.deleteMany();
  await db.hackathon.deleteMany();
  await db.member.deleteMany();
  await db.project.deleteMany();
  await db.category.deleteMany();
  await db.category.create({ data: { slug: "ai-ml", name: "AI / ML" } });
  await db.member.createMany({ data: [{ id: "m1", name: "Aina" }, { id: "m2", name: "Wei Jie" }] });
});

const KL = { title: "KL AI Hack", url: "https://example.com/kl", mode: "in_person", city: "Kuala Lumpur", country: "Malaysia", categories: ["ai-ml"], submissionDueAt: "2030-01-10T10:00:00Z" };
const create = async (body: object = KL) => (await http().post("/hackathons").send(body).expect(201)).body;

describe("hackathons", () => {
  it("creates, filters by region and category, and logs the creation", async () => {
    const kl = await create();
    await create({ title: "Remote Hack", url: "https://example.com/r", mode: "online" });
    expect(kl).toMatchObject({ region: "malaysia", stage: "discovered", phase: "initiation", categories: [{ slug: "ai-ml" }] });

    const malaysia = (await http().get("/hackathons?region=malaysia").expect(200)).body;
    expect(malaysia.map((h: { title: string }) => h.title)).toEqual(["KL AI Hack"]);
    const ai = (await http().get("/hackathons?category=ai-ml").expect(200)).body;
    expect(ai).toHaveLength(1);

    const ws = (await http().get(`/hackathons/${kl.id}`).expect(200)).body;
    expect(ws.activity[0]).toMatchObject({ kind: "change", text: "Added by hand" });
  });

  it("rejects bad input with the failing fields", async () => {
    const res = await http().post("/hackathons").send({ ...KL, url: "javascript:alert(1)", mode: "teleport" }).expect(400);
    expect(res.body.issues.map((i: { path: string }) => i.path).sort()).toEqual(["mode", "url"]);
    await http().get("/hackathons/nope").expect(404);
  });

  it("moving to Registered adds the task template once, with deadlines counted back", async () => {
    const h = await create();
    const first = (await http().post(`/hackathons/${h.id}/stage`).send({ stage: "registered" }).expect(200)).body;
    expect(first.tasks).toHaveLength(TASK_TEMPLATE.length);
    expect(first.tasks.at(-1)).toMatchObject({ title: "Submit", dueAt: "2030-01-10T09:00:00.000Z" });
    expect(first.phase).toBe("planning");

    await http().post(`/hackathons/${h.id}/stage`).send({ stage: "interested" }).expect(200);
    const again = (await http().post(`/hackathons/${h.id}/stage`).send({ stage: "registered" }).expect(200)).body;
    expect(again.tasks).toHaveLength(TASK_TEMPLATE.length);
    expect(again.activity.map((a: { text: string }) => a.text)).toContain("Stage: interested → registered");
  });

  it("moving to Results needs a result, and leaving Results clears it", async () => {
    const h = await create();
    await http().post(`/hackathons/${h.id}/stage`).send({ stage: "results" }).expect(400);
    const won = (await http().post(`/hackathons/${h.id}/stage`).send({ stage: "results", result: "won" }).expect(200)).body;
    expect(won).toMatchObject({ stage: "results", result: "won", phase: "closing" });
    const back = (await http().post(`/hackathons/${h.id}/stage`).send({ stage: "submitted" }).expect(200)).body;
    expect(back.result).toBeNull();
  });

  it("team needs exactly one accountable member and the change is logged", async () => {
    const h = await create();
    await http().put(`/hackathons/${h.id}/team`).send([{ memberId: "m1", role: "lead" }]).expect(400);
    const ws = (
      await http()
        .put(`/hackathons/${h.id}/team`)
        .send([{ memberId: "m1", role: "lead", accountable: true }, { memberId: "m2", role: "developer" }])
        .expect(200)
    ).body;
    expect(ws.assignments).toHaveLength(2);
    expect(ws.activity[0].text).toBe("Team set: Aina (lead, accountable), Wei Jie (developer)");
  });

  it("task status changes are logged; tasks of another hackathon can't be touched", async () => {
    const a = await create();
    const b = await create({ ...KL, title: "Other" });
    const task = (await http().post(`/hackathons/${a.id}/tasks`).send({ title: "Pitch deck" }).expect(201)).body;
    await http().patch(`/hackathons/${a.id}/tasks/${task.id}`).send({ status: "done" }).expect(200);
    await http().patch(`/hackathons/${b.id}/tasks/${task.id}`).send({ status: "todo" }).expect(404);
    const ws = (await http().get(`/hackathons/${a.id}`).expect(200)).body;
    expect(ws.activity[0].text).toBe('Task "Pitch deck" moved to done');
  });
});

describe("patch", () => {
  it("changes only the fields sent", async () => {
    const h = await create({ ...KL, prizeTracks: [{ name: "Best AI" }] });
    const after = (await http().patch(`/hackathons/${h.id}`).send({ decisionNote: "Close to home" }).expect(200)).body;
    expect(after).toMatchObject({ decisionNote: "Close to home", source: "manual", categories: [{ slug: "ai-ml" }], prizeTracks: [{ name: "Best AI" }] });
  });
});

describe("board", () => {
  const stage = (id: string, body: object) => http().post(`/hackathons/${id}/stage`).send(body).expect(200);

  it("groups cards by stage with progress and next deadline; filters; skipped only on request", async () => {
    const a = await create({ ...KL, ownerId: undefined });
    const b = await create({ title: "Remote Hack", url: "https://example.com/r", mode: "online" });
    const c = await create({ ...KL, title: "Skip me" });
    await create({ ...KL, title: "Still discovered" });
    await stage(a.id, { stage: "registered" });
    await http().patch(`/hackathons/${a.id}`).send({ ownerId: "m1" }).expect(200);
    const tasks = (await http().get(`/hackathons/${a.id}`)).body.tasks;
    await http().patch(`/hackathons/${a.id}/tasks/${tasks[0].id}`).send({ status: "done" }).expect(200);
    await stage(b.id, { stage: "interested" });
    await stage(c.id, { stage: "skipped" });

    const board = (await http().get("/hackathons/board").expect(200)).body;
    expect(Object.keys(board)).toEqual(["interested", "registered", "building", "submitted", "results"]);
    expect(board.registered).toHaveLength(1);
    expect(board.registered[0]).toMatchObject({
      title: "KL AI Hack",
      owner: { name: "Aina" },
      progress: { done: 1, total: tasks.length },
      nextDeadline: { kind: "submission", at: "2030-01-10T10:00:00.000Z" },
    });
    expect(board.interested[0]).toMatchObject({ title: "Remote Hack", nextDeadline: null, progress: { done: 0, total: 0 } });

    const online = (await http().get("/hackathons/board?mode=online").expect(200)).body;
    expect([online.interested.length, online.registered.length]).toEqual([1, 0]);
    expect((await http().get("/hackathons/board?owner=m1").expect(200)).body.interested).toHaveLength(0);
    expect((await http().get("/hackathons/board?week=1").expect(200)).body.registered).toHaveLength(0);
    expect((await http().get("/hackathons/board?skipped=1").expect(200)).body.skipped).toMatchObject([{ title: "Skip me" }]);
    await http().get("/hackathons/board?mode=space").expect(400);
  });
});

describe("members, projects, team", () => {
  it("create and validate", async () => {
    const m = (await http().post("/members").send({ name: "Harish", skills: ["Flutter"], preferredRoles: ["developer"] }).expect(201)).body;
    expect(m.skills).toEqual(["Flutter"]);
    await http().post("/members").send({ name: "", email: "not-an-email" }).expect(400);

    const p = (await http().post("/projects").send({ name: "Banjir Watch", tech: ["Flutter"], repoUrl: "https://github.com/x/y" }).expect(201)).body;
    expect(p.tech).toEqual(["Flutter"]);
    await http().post("/projects").send({ name: "X", repoUrl: "ftp://nope" }).expect(400);

    const t = (await http().put("/team").send({ name: "Kopi & Commit", preferredTech: ["TypeScript"] }).expect(200)).body;
    expect(t).toMatchObject({ name: "Kopi & Commit", homeCity: "Kuala Lumpur", preferredTech: ["TypeScript"] });
    await http().put("/team").send({ name: "" }).expect(400);
  });
});

describe("team workload", () => {
  it("lists active hackathons and each member's roles, open tasks and clashes", async () => {
    const a = await create({ ...KL, startsAt: "2030-01-08T00:00:00Z" });
    const b = await create({ ...KL, title: "Overlapping Hack", startsAt: "2030-01-09T00:00:00Z" });
    await create({ ...KL, title: "Only interested" });
    for (const h of [a, b]) await http().post(`/hackathons/${h.id}/stage`).send({ stage: "registered" }).expect(200);
    await http().put(`/hackathons/${a.id}/team`).send([{ memberId: "m1", role: "lead", accountable: true }]).expect(200);
    await http().put(`/hackathons/${b.id}/team`).send([{ memberId: "m1", role: "pitch", accountable: false }, { memberId: "m2", role: "lead", accountable: true }]).expect(200);
    const ws = (await http().get(`/hackathons/${a.id}`).expect(200)).body;
    await http().patch(`/hackathons/${a.id}/tasks/${ws.tasks[0].id}`).send({ assigneeId: "m1" }).expect(200);

    const w = (await http().get("/team/workload").expect(200)).body;
    expect(w.hackathons.map((h: { title: string }) => h.title).sort()).toEqual(["KL AI Hack", "Overlapping Hack"]);
    expect(w.members.find((r: { member: { id: string } }) => r.member.id === "m1")).toMatchObject({
      hackathons: expect.arrayContaining([{ id: a.id, role: "lead", accountable: true }, { id: b.id, role: "pitch", accountable: false }]),
      openTasks: 1,
      clashes: [expect.arrayContaining([a.id, b.id])],
    });
    expect(w.members.find((r: { member: { id: string } }) => r.member.id === "m2")).toMatchObject({ hackathons: [{ id: b.id, role: "lead", accountable: true }], openTasks: 0, clashes: [] });
  });
});
