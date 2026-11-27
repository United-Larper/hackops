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
  await db.member.deleteMany({ where: { id: { not: TESTER } } });
  await db.team.deleteMany();
});
afterAll(() => app.close());

describe("GET /signup-profile", () => {
  it("answers any origin, but only with its owner's token and only with the owner's sign-up fields", async () => {
    await http().put("/team").send({ name: "Demo Team", pitch: "We ship." }).expect(200);
    await db.member.create({ data: { name: "Aina", email: "aina@example.com", skills: ["React"], tshirtSize: "M", dietary: "Vegetarian" } });
    await db.member.update({ where: { id: TESTER }, data: { tshirtSize: "L" } });
    const { fillToken } = (await http().post("/auth/fill-token").expect(201)).body as { fillToken: string };

    for (const bad of ["", "?token=", "?token=wrong", "?token=é", "?token[]=x"]) {
      const res = await request(app.getHttpServer()).get(`/signup-profile${bad}`).expect(404);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
    }

    // No session needed: the bookmarklet runs on a third-party page.
    const res = await request(app.getHttpServer()).get(`/signup-profile?token=${fillToken}`).expect(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.body.team).toEqual({ name: "Demo Team", pitch: "We ship." });
    expect(res.body.member).toMatchObject({ name: "Test Person", email: "tester@example.com", tshirtSize: "L" });
    expect(Object.keys(res.body.member).sort()).toEqual(["dietary", "email", "githubUrl", "linkedinUrl", "name", "organisation", "portfolioUrl", "tshirtSize"]);
    expect(res.text).not.toContain("Aina"); // a token never shows anyone else's details

    await http().post("/auth/fill-token").expect(201); // rotating retires the old token
    await request(app.getHttpServer()).get(`/signup-profile?token=${fillToken}`).expect(404);
    expect((await http().get("/team").expect(200)).headers["access-control-allow-origin"]).toBeUndefined();
  });
});
