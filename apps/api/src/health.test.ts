import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "./app.module";

let app: INestApplication;

beforeAll(async () => {
  process.env.DATABASE_URL = ":memory:";
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = await mod.createNestApplication().init();
});
afterAll(() => app.close());

it("GET /health reports the database and shared package", async () => {
  const res = await request(app.getHttpServer()).get("/health").expect(200);
  expect(res.body).toEqual({ ok: true, db: "up", shared: "execution" });
});
