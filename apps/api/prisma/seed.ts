// Base data: the one member and the team row (categories are the CATEGORIES constant in @hackops/shared). The hackathons come from the
// team's own list (pnpm --filter api import-list), not from here.
// Safe to run repeatedly. It removes members without an email, every project and any old demo hackathons. Members
// added with add-member stay.
import { pgAdapter } from "../src/db";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/auth";
import { TEAM_ID } from "@hackops/shared";

const db = new PrismaClient({ adapter: pgAdapter() });
// The one member comes from apps/api/.env (SEED_MEMBER_NAME, SEED_MEMBER_EMAIL), so a real address never lands in git.
const MEMBERS = [{ name: process.env.SEED_MEMBER_NAME?.trim() ?? "", email: process.env.SEED_MEMBER_EMAIL?.trim().toLowerCase() ?? "" }];

async function main() {
  // Checked before anything is deleted: without a member, the seed would remove everyone.
  if (MEMBERS.some((m) => !m.name || !m.email.includes("@"))) throw new Error("Set SEED_MEMBER_NAME and SEED_MEMBER_EMAIL in apps/api/.env first");
  // Deleting a member drops their sessions, secret and assignments, and clears them as assignee.
  // Deleting a hackathon drops its tasks, assignments and activity.
  const emails = MEMBERS.map((m) => m.email);
  await db.member.deleteMany({ where: { email: null } });
  await db.project.deleteMany();
  await db.hackathon.deleteMany({ where: { source: "demo" } });
  const ids: string[] = [];
  for (const m of MEMBERS) ids.push((await db.member.upsert({ where: { email: m.email }, create: m, update: { name: m.name } })).id);
  // Logins only when asked for: SEED_PASSWORD=… pnpm --filter api db:seed. Otherwise use set-password.
  const seedPassword = process.env.SEED_PASSWORD;
  if (seedPassword && seedPassword.length < 10) throw new Error("SEED_PASSWORD needs at least 10 characters");
  if (seedPassword) {
    const passwordHash = await hashPassword(seedPassword);
    for (const memberId of ids) await db.memberSecret.upsert({ where: { memberId }, create: { memberId, passwordHash }, update: { passwordHash } });
  }
  const team = { name: "Kopi & Commit", pitch: "Four friends from KL who ship in a weekend." };
  await db.team.upsert({ where: { id: TEAM_ID }, create: team, update: team });

  const counts = { hackathons: await db.hackathon.count(), members: await db.member.count(), projects: await db.project.count(), tasks: await db.task.count() };
  console.log("Seeded", counts);
  console.log(seedPassword
    ? `Sign in as ${emails.join(", ")} with SEED_PASSWORD.`
    : `No passwords set. Run: pnpm --filter api set-password ${emails[0]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
