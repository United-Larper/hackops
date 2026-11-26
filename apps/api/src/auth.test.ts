import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "./app.module";
import { hashPassword, verifyPassword } from "./auth";
import { PrismaService } from "./prisma.service";
import { signedIn, TESTER, TESTER_EMAIL, TESTER_PASSWORD } from "../test/auth";

let app: INestApplication;
let db: PrismaService;
let http: Awaited<ReturnType<typeof signedIn>>["http"];
const anon = () => request(app.getHttpServer());
const login = (email: string, password: string, address = "203.0.113.7") =>
  anon().post("/auth/login").set("x-client-address", address).send({ email, password });

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = await mod.createNestApplication().init();
  db = app.get(PrismaService);
});
afterAll(() => app.close());
beforeEach(async () => {
  await db.session.deleteMany();
  await db.loginFailure.deleteMany();
  await db.activity.deleteMany();
  await db.hackathon.deleteMany();
  http = (await signedIn(app, db)).http;
});

describe("passwords", () => {
  it("hashes with a fresh salt and verifies only the right password", async () => {
    const a = await hashPassword("correct horse battery");
    expect(a).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
    expect(a).not.toBe(await hashPassword("correct horse battery"));
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batter", a)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });
});

describe("the auth gate", () => {
  it("turns away every route without a session, except the public list", async () => {
    for (const [method, path] of [["get", "/members"], ["get", "/team"], ["get", "/hackathons"], ["post", "/discovery/refresh"], ["get", "/auth/me"]] as const) {
      await anon()[method](path).expect(401);
    }
    await anon().get("/health").expect(200);
    await anon().get("/portfolio").expect(200);
    await anon().get("/members").set("authorization", "Bearer not-a-session-token-at-all").expect(401);
  });

  it("refuses a form post from another site", async () => {
    const h = await db.hackathon.create({ data: { source: "manual", title: "Hack", url: "https://example.com", mode: "online", stage: "interested" } });
    await anon().post(`/hackathons/${h.id}/stage`).type("form").send({ stage: "discovered" }).expect(401);
    expect((await db.hackathon.findUniqueOrThrow({ where: { id: h.id } })).stage).toBe("interested");
  });

  it("refuses an expired session and forgets it", async () => {
    const { token } = (await login(TESTER_EMAIL, TESTER_PASSWORD).expect(201)).body as { token: string };
    await db.session.updateMany({ where: { memberId: TESTER }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await anon().get("/auth/me").set("authorization", `Bearer ${token}`).expect(401);
    expect(await db.session.count({ where: { memberId: TESTER } })).toBeLessThan(2);
  });
});

describe("POST /auth/login", () => {
  it("signs in with any-case email and gives the same answer for a wrong password and an unknown email", async () => {
    const ok = (await login("Tester@Example.com", TESTER_PASSWORD).expect(201)).body;
    expect(ok.member).toEqual({ id: TESTER, name: "Test Person" });
    await anon().get("/auth/me").set("authorization", `Bearer ${ok.token}`).expect(200);
    // only the hash is stored
    expect(await db.session.count({ where: { tokenHash: ok.token } })).toBe(0);

    const wrong = (await login(TESTER_EMAIL, "not the password").expect(401)).body;
    const unknown = (await login("nobody@example.com", "not the password").expect(401)).body;
    expect(wrong.message).toBe(unknown.message);
  });

  it("locks an email after five failures, from any address, and an API restart doesn't lift it", async () => {
    for (let i = 0; i < 5; i++) await login(TESTER_EMAIL, "wrong password", `198.51.100.${i}`).expect(401);
    await login(TESTER_EMAIL, TESTER_PASSWORD, "198.51.100.99").expect(429); // even the right password waits

    const again = await (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication().init();
    await request(again.getHttpServer()).post("/auth/login").send({ email: TESTER_EMAIL, password: TESTER_PASSWORD }).expect(429);
    await again.close();
  });

  it("locks an address that tries many emails", async () => {
    // 29 recorded failures (each real one costs a scrypt run), then the 30th through the API.
    await db.loginFailure.createMany({ data: Array.from({ length: 29 }, (_, i) => ({ email: `guess${i}@example.com`, address: "192.0.2.50" })) });
    await login("guess29@example.com", "wrong password", "192.0.2.50").expect(401);
    await login(TESTER_EMAIL, TESTER_PASSWORD, "192.0.2.50").expect(429);
    await login(TESTER_EMAIL, TESTER_PASSWORD, "192.0.2.51").expect(201); // another address isn't affected
  });

  it("forgets an email's failures once it signs in", async () => {
    for (let i = 0; i < 4; i++) await login(TESTER_EMAIL, "wrong password").expect(401);
    await login(TESTER_EMAIL, TESTER_PASSWORD).expect(201);
    expect(await db.loginFailure.count({ where: { email: TESTER_EMAIL } })).toBe(0);
  });
});

describe("signed in", () => {
  it("records who made a change", async () => {
    const h = (await http().post("/hackathons").send({ source: "manual", title: "Hack", url: "https://example.com", mode: "online" }).expect(201)).body;
    await http().post(`/hackathons/${h.id}/notes`).send({ text: "Idea: flood maps" }).expect(201);
    const rows = await db.activity.findMany({ where: { hackathonId: h.id } });
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.memberId === TESTER)).toBe(true);
  });

  it("never sends secrets with members", async () => {
    await http().post("/auth/fill-token").expect(201);
    const body = JSON.stringify((await http().get("/members").expect(200)).body) + JSON.stringify((await http().get(`/members/${TESTER}`).expect(200)).body);
    expect(body).not.toMatch(/passwordHash|fillToken|scrypt|tokenHash/);
  });

  it("logs out", async () => {
    await http().post("/auth/logout").expect(204);
    await http().get("/auth/me").expect(401);
  });

  it("changes the password and signs out the other sessions", async () => {
    const other = (await login(TESTER_EMAIL, TESTER_PASSWORD).expect(201)).body.token as string;
    await http().post("/auth/password").send({ current: "wrong", next: "a brand new password" }).expect(401);
    await http().post("/auth/password").send({ current: TESTER_PASSWORD, next: "short" }).expect(400);
    await http().post("/auth/password").send({ current: TESTER_PASSWORD, next: "a brand new password" }).expect(204);

    await http().get("/auth/me").expect(200); // this session stays
    await anon().get("/auth/me").set("authorization", `Bearer ${other}`).expect(401);
    await login(TESTER_EMAIL, TESTER_PASSWORD).expect(401);
    await login(TESTER_EMAIL, "a brand new password").expect(201);
  });
});
