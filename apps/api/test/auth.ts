import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { hashPassword, newToken, sha256 } from "../src/auth";
import type { PrismaService } from "../src/prisma.service";

/** The member every API test is signed in as. Test cleanups keep this row: `{ id: { not: TESTER } }`. */
export const TESTER = "m-tester";
export const TESTER_EMAIL = "tester@example.com";
export const TESTER_PASSWORD = "correct horse battery";

/** Creates the tester (with a password) and a fresh session; returns a supertest client that sends its bearer token. */
export async function signedIn(app: INestApplication, db: PrismaService) {
  const passwordHash = await hashPassword(TESTER_PASSWORD);
  await db.member.upsert({ where: { id: TESTER }, create: { id: TESTER, name: "Test Person", email: TESTER_EMAIL }, update: {} });
  await db.memberSecret.upsert({ where: { memberId: TESTER }, create: { memberId: TESTER, passwordHash }, update: { passwordHash } });
  const token = newToken();
  await db.session.create({ data: { tokenHash: sha256(token), memberId: TESTER, expiresAt: new Date(Date.now() + 86_400_000) } });
  const auth = `Bearer ${token}`;
  return { http: () => request.agent(app.getHttpServer()).set("authorization", auth), token };
}
