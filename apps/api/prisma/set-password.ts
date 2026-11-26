// Sets a random temporary password for one member and prints it once: the first-run and "forgot password" path,
// since HackOps sends no email. Signs that member out everywhere. Usage: pnpm --filter api set-password <email>
import { randomBytes } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/auth";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: pnpm --filter api set-password <email>");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) });

async function main() {
  const member = await db.member.findUnique({ where: { email: email! }, select: { id: true, name: true } });
  if (!member) {
    console.error(`No member has the email ${email}. Add it on their page under Team first.`);
    process.exitCode = 1;
    return;
  }
  // Generated, never typed: nothing lands in shell history, and it's long enough to pass the 10-character rule.
  const password = randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.memberSecret.upsert({ where: { memberId: member.id }, create: { memberId: member.id, passwordHash }, update: { passwordHash } }),
    db.session.deleteMany({ where: { memberId: member.id } }),
  ]);
  console.log(`Temporary password for ${member.name} (${email}):\n\n  ${password}\n\nSign in with it, then change it on your own page under Team.`);
}

main().finally(() => db.$disconnect());
