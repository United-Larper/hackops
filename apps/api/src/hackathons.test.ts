import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { TASK_TEMPLATE } from "@hackops/shared";
import type { Prisma } from "./generated/prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma.service";
import { newToken, sha256 } from "./auth";
import { signedIn, TESTER } from "../test/auth";

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
  await db.assignment.deleteMany();
  await db.hackathon.deleteMany();
  await db.member.deleteMany({ where: { id: { not: TESTER } } });
  await db.project.deleteMany();
  await db.member.createMany({ data: [{ id: "m1", name: "Aina" }, { id: "m2", name: "Wei Jie" }] });
});

/** A client signed in as another member: whoever saves a lineup is its accountable member. */
const as = async (memberId: string) => {
  const token = newToken();
  await db.session.create({ data: { tokenHash: sha256(token), memberId, expiresAt: new Date(Date.now() + 86_400_000) } });
  return request.agent(app.getHttpServer()).set("authorization", `Bearer ${token}`);
};

const KL = { title: "KL AI Hack", url: "https://example.com/kl", mode: "in_person", city: "Kuala Lumpur", country: "Malaysia", categories: ["ai-ml"], submissionDueAt: "2030-01-10T10:00:00Z" };
// Hackathons come from discovery or import-list, never a route: fixtures go straight in, then are read back through the API.
const create = async (body: object = KL) => {
  const h = await db.hackathon.create({ data: { source: "my-list", ...body } as Prisma.HackathonCreateInput });
  return (await http().get(`/hackathons/${h.id}`).expect(200)).body;
};

describe("hackathons", () => {
  it("filters by region and category", async () => {
    const kl = await create();
    await create({ title: "Remote Hack", url: "https://example.com/r", mode: "online" });
    expect(kl).toMatchObject({ region: "malaysia", stage: "discovered", phase: "initiation", categories: [{ slug: "ai-ml" }] });

    const malaysia = (await http().get("/hackathons?region=malaysia").expect(200)).body;
    expect(malaysia.map((h: { title: string }) => h.title)).toEqual(["KL AI Hack"]);
    const ai = (await http().get("/hackathons?category=ai-ml").expect(200)).body;
    expect(ai).toHaveLength(1);
  });

  it("rejects bad input with the failing fields", async () => {
    const h = await create();
    const res = await http().patch(`/hackathons/${h.id}`).send({ url: "javascript:alert(1)", mode: "teleport" }).expect(400);
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
    // The rule holds below the API too: a script writing the row directly is refused.
    await expect(db.hackathon.update({ where: { id: h.id }, data: { result: "won" } })).rejects.toThrow(/Hackathon_result_needs_results_stage/);
  });

  it("a note on a move to Registered or Skipped becomes the decision note", async () => {
    const h = await create();
    const reg = (await http().post(`/hackathons/${h.id}/stage`).send({ stage: "registered", note: "Close to home" }).expect(200)).body;
    expect(reg.decisionNote).toBe("Close to home");
    const building = (await http().post(`/hackathons/${h.id}/stage`).send({ stage: "building", note: "Repo is up" }).expect(200)).body;
    expect(building.decisionNote).toBe("Close to home");
  });

  it("whoever saves the team is accountable, must be in it, and the change is logged", async () => {
    const h = await create();
    await http().put(`/hackathons/${h.id}/team`).send([{ memberId: "m1", role: "lead" }]).expect(400); // the tester isn't in it
    const ws = (
      await (await as("m1"))
        .put(`/hackathons/${h.id}/team`)
        .send([{ memberId: "m1", role: "lead" }, { memberId: "m2", role: "developer", accountable: true }])
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
    expect(after).toMatchObject({ decisionNote: "Close to home", source: "my-list", categories: [{ slug: "ai-ml", name: "AI / ML" }], prizeTracks: [{ name: "Best AI" }] });
  });
});

describe("board", () => {
  const stage = (id: string, body: object) => http().post(`/hackathons/${id}/stage`).send(body).expect(200);

  it("groups cards by stage with progress and next deadline; filters; skipped only on request", async () => {
    const a = await create();
    const b = await create({ title: "Remote Hack", url: "https://example.com/r", mode: "online" });
    const c = await create({ ...KL, title: "Skip me" });
    await create({ ...KL, title: "Still discovered" });
    await stage(a.id, { stage: "registered" });
    await (await as("m1")).put(`/hackathons/${a.id}/team`).send([{ memberId: "m1", role: "lead" }, { memberId: "m2", role: "developer" }]).expect(200);
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
    const mine = (await http().get("/hackathons/board?owner=m1").expect(200)).body;
    expect([mine.interested.length, mine.registered.length]).toEqual([0, 1]);
    expect((await http().get("/hackathons/board?owner=m2").expect(200)).body.registered).toHaveLength(0); // on the team, not accountable
    expect((await http().get("/hackathons/board?week=1").expect(200)).body.registered).toHaveLength(0);
    expect((await http().get("/hackathons/board?skipped=1").expect(200)).body.skipped).toMatchObject([{ title: "Skip me" }]);
    await http().get("/hackathons/board?mode=space").expect(400);
  });
});

describe("members, projects, team", () => {
  it("create and validate", async () => {
    await http().post("/members").send({ name: "Harish" }).expect(404); // members are added only in the database
    await http().delete(`/members/${TESTER}`).expect(404);
    const m = (await http().patch(`/members/${TESTER}`).send({ skills: ["Flutter"] }).expect(200)).body;
    expect(m.skills).toEqual(["Flutter"]);
    await http().patch(`/members/${TESTER}`).send({ email: "not-an-email" }).expect(400);

    const p = (await http().post("/projects").send({ name: "Banjir Watch", tech: ["Flutter"], repoUrl: "https://github.com/x/y" }).expect(201)).body;
    expect(p.tech).toEqual(["Flutter"]);
    await http().post("/projects").send({ name: "X", repoUrl: "ftp://nope" }).expect(400);

    const t = (await http().put("/team").send({ name: "Kopi & Commit" }).expect(200)).body;
    expect(t).toEqual({ name: "Kopi & Commit", pitch: null });
    await http().put("/team").send({ name: "" }).expect(400);
  });
});

describe("team workload", () => {
  it("lists active hackathons and each member's roles, open tasks and clashes", async () => {
    const a = await create({ ...KL, startsAt: "2030-01-08T00:00:00Z" });
    const b = await create({ ...KL, title: "Overlapping Hack", startsAt: "2030-01-09T00:00:00Z" });
    await create({ ...KL, title: "Only interested" });
    for (const h of [a, b]) await http().post(`/hackathons/${h.id}/stage`).send({ stage: "registered" }).expect(200);
    await (await as("m1")).put(`/hackathons/${a.id}/team`).send([{ memberId: "m1", role: "lead" }]).expect(200);
    await (await as("m2")).put(`/hackathons/${b.id}/team`).send([{ memberId: "m1", role: "pitch" }, { memberId: "m2", role: "lead" }]).expect(200);
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

describe("member history", () => {
  it("lists the member's submitted and finished hackathons with role and result, newest first", async () => {
    const old = await create({ ...KL, title: "Old Hack", endsAt: "2029-01-02T00:00:00Z" });
    const recent = await create({ ...KL, title: "Recent Hack", endsAt: "2029-06-02T00:00:00Z" });
    const live = await create({ ...KL, title: "Live Hack" });
    for (const h of [old, recent, live]) {
      await (await as("m1")).put(`/hackathons/${h.id}/team`).send([{ memberId: "m1", role: "designer" }]).expect(200);
    }
    await http().post(`/hackathons/${old.id}/stage`).send({ stage: "results", result: "won" }).expect(200);
    await http().post(`/hackathons/${recent.id}/stage`).send({ stage: "submitted" }).expect(200);
    await http().post(`/hackathons/${live.id}/stage`).send({ stage: "building" }).expect(200);

    const m = (await http().get("/members/m1").expect(200)).body;
    expect(m.name).toBe("Aina");
    expect(m.history).toEqual([
      { hackathon: { id: recent.id, title: "Recent Hack", stage: "submitted", endsAt: "2029-06-02T00:00:00.000Z" }, role: "designer", accountable: true, result: null },
      { hackathon: { id: old.id, title: "Old Hack", stage: "results", endsAt: "2029-01-02T00:00:00.000Z" }, role: "designer", accountable: true, result: "won" },
    ]);
    expect((await http().get("/members/m2").expect(200)).body.history).toEqual([]);
    await http().get("/members/nope").expect(404);
  });
});

describe("projects", () => {
  it("lists entry counts, and a project's hackathons with results, newest first", async () => {
    const p = (await http().post("/projects").send({ name: "Banjir Watch", tech: ["Flutter"] }).expect(201)).body;
    const old = await create({ ...KL, title: "Old Hack", endsAt: "2029-01-02T00:00:00Z" });
    const recent = await create({ ...KL, title: "Recent Hack", endsAt: "2029-06-02T00:00:00Z" });
    for (const h of [old, recent]) await http().patch(`/hackathons/${h.id}`).send({ projectId: p.id }).expect(200);
    await http().post(`/hackathons/${old.id}/stage`).send({ stage: "results", result: "finalist" }).expect(200);

    expect((await http().get("/projects").expect(200)).body).toMatchObject([{ name: "Banjir Watch", entries: 2 }]);
    const detail = (await http().get(`/projects/${p.id}`).expect(200)).body;
    expect(detail.tech).toEqual(["Flutter"]);
    expect(detail.hackathons).toEqual([
      { id: recent.id, title: "Recent Hack", stage: "discovered", result: null, endsAt: "2029-06-02T00:00:00.000Z" },
      { id: old.id, title: "Old Hack", stage: "results", result: "finalist", endsAt: "2029-01-02T00:00:00.000Z" },
    ]);
  });
});

describe("portfolio", () => {
  it("lists only Submitted and Results entries, newest first, filtered by category or member", async () => {
    const p = (await http().post("/projects").send({ name: "Banjir Watch", tech: ["Flutter"], repoUrl: "https://github.com/x/y" }).expect(201)).body;
    const won = await create({ ...KL, title: "Won Hack", endsAt: "2029-01-02T00:00:00Z" });
    const sent = await create({ ...KL, title: "Sent Hack", endsAt: "2029-06-02T00:00:00Z", categories: [] });
    const live = await create({ ...KL, title: "Live Hack" });
    await http().patch(`/hackathons/${won.id}`).send({ projectId: p.id, retroWentWell: "secret retro", decisionNote: "secret decision" }).expect(200);
    await (await as("m1")).put(`/hackathons/${won.id}/team`).send([{ memberId: "m1", role: "lead" }, { memberId: "m2", role: "pitch" }]).expect(200);
    await (await as("m2")).put(`/hackathons/${sent.id}/team`).send([{ memberId: "m2", role: "developer" }]).expect(200);
    await http().post(`/hackathons/${won.id}/stage`).send({ stage: "results", result: "won" }).expect(200);
    await http().post(`/hackathons/${sent.id}/stage`).send({ stage: "submitted" }).expect(200);
    await http().post(`/hackathons/${live.id}/stage`).send({ stage: "building" }).expect(200);

    const all = (await http().get("/portfolio").expect(200)).body;
    expect(all.entries.map((e: { title: string }) => e.title)).toEqual(["Sent Hack", "Won Hack"]);
    expect(all.entries[1]).toMatchObject({
      result: "won",
      categories: [{ slug: "ai-ml", name: "AI / ML" }],
      project: { name: "Banjir Watch", tech: ["Flutter"], repoUrl: "https://github.com/x/y" },
      team: [{ id: "m1", name: "Aina", role: "lead" }, { id: "m2", name: "Wei Jie", role: "pitch" }],
    });
    expect(all.members).toEqual([{ id: "m1", name: "Aina" }, { id: "m2", name: "Wei Jie" }]);
    expect(all.entries.map((e: { sample: boolean }) => e.sample)).toEqual([false, false]);
    await db.hackathon.update({ where: { id: won.id }, data: { source: "demo" } });
    expect((await http().get("/portfolio?member=m1").expect(200)).body.entries[0].sample).toBe(true);

    const byCat = (await http().get("/portfolio?category=ai-ml").expect(200)).body;
    expect(byCat.entries.map((e: { title: string }) => e.title)).toEqual(["Won Hack"]);
    const byMember = (await http().get("/portfolio?member=m1").expect(200)).body;
    expect(byMember.entries.map((e: { title: string }) => e.title)).toEqual(["Won Hack"]);
  });

  it("never exposes private member fields or internal notes", async () => {
    await db.member.update({ where: { id: "m1" }, data: { email: "aina@example.com", tshirtSize: "S", dietary: "Halal", organisation: "UM" } });
    const h = await create({ ...KL, title: "Done Hack" });
    await http().patch(`/hackathons/${h.id}`).send({ decisionNote: "secret decision", retroWentWell: "secret retro", retroToChange: "secret change" }).expect(200);
    await (await as("m1")).put(`/hackathons/${h.id}/team`).send([{ memberId: "m1", role: "lead" }]).expect(200);
    await http().post(`/hackathons/${h.id}/stage`).send({ stage: "results", result: "finalist", note: "secret note" }).expect(200);
    await http().patch(`/hackathons/${h.id}`).send({ resultNote: "secret judges feedback" }).expect(200);
    const p = (await http().post("/projects").send({ name: "Banjir Watch", tech: ["Flutter"] }).expect(201)).body;
    await http().patch(`/hackathons/${h.id}`).send({ projectId: p.id }).expect(200);

    const res = await request(app.getHttpServer()).get("/portfolio").expect(200); // public: no session
    expect(res.body.entries).toHaveLength(1);
    // Picked by hand: a column added to Project later stays private until someone adds it here on purpose.
    expect(Object.keys(res.body.entries[0].project).sort()).toEqual(["demoUrl", "description", "devpostUrl", "name", "repoUrl", "slidesUrl", "tech", "videoUrl"]);
    for (const secret of ["aina@example.com", "Halal", "UM", "tshirtSize", "email", "dietary", "organisation", "secret"]) {
      expect(res.text).not.toContain(secret);
    }
  });
});
