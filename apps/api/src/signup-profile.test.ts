import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma.service";

let app: INestApplication;
let db: PrismaService;
const http = () => request(app.getHttpServer());

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = await mod.createNestApplication().init();
  db = app.get(PrismaService);
  await db.member.deleteMany();
  await db.team.deleteMany();
});
afterAll(() => app.close());

describe("GET /signup-profile", () => {
  it("answers any origin, but only with the bookmarklet token and only with sign-up fields", async () => {
    await http().put("/team").send({ name: "Demo Team", pitch: "We ship." }).expect(200);
    await db.member.create({ data: { name: "Aina", email: "aina@example.com", skills: '["React"]', tshirtSize: "M" } });
    const { fillToken } = (await http().post("/team/fill-token").expect(201)).body as { fillToken: string };

    for (const bad of ["", "?token=", "?token=wrong", "?token=é", "?token[]=x"]) {
      const res = await http().get(`/signup-profile${bad}`).expect(404);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
    }

    const res = await http().get(`/signup-profile?token=${fillToken}`).expect(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.body.team).toEqual({ name: "Demo Team", pitch: "We ship." });
    expect(Object.keys(res.body.members[0]).sort()).toEqual(["dietary", "email", "githubUrl", "id", "linkedinUrl", "name", "organisation", "tshirtSize"]);

    await http().post("/team/fill-token").expect(201); // rotating retires the old token
    await http().get(`/signup-profile?token=${fillToken}`).expect(404);
    expect((await http().get("/team").expect(200)).headers["access-control-allow-origin"]).toBeUndefined();
  });
});
