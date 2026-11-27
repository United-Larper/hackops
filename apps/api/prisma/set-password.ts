// Sets a random temporary password for one member and prints it once: the first-run and "forgot password" path,
// since HackOps sends no email. Signs that member out everywhere, turns off two-step sign-in (a lost phone) and lifts any sign-in lockout on their email. Usage: pnpm --filter api set-password <email>
import { randomBytes } from "node:crypto";
import { pgAdapter } from "../src/db";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/auth";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: pnpm --filter api set-password <email>");
  process.exit(1);
}

const db = new PrismaClient({ adapter: pgAdapter() });

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
    db.memberSecret.upsert({ where: { memberId: member.id }, create: { memberId: member.id, passwordHash }, update: { passwordHash, totpSecret: null, totpLastStep: null } }),
    db.session.deleteMany({ where: { memberId: member.id } }),
    db.loginFailure.deleteMany({ where: { email: email! } }), // a reset also lifts a sign-in lockout
  ]);
  console.log(`Temporary password for ${member.name} (${email}):\n\n  ${password}\n\nSign in with it, then change it on your own page under Team. Two-step sign-in is off until they turn it on again.`);
}

main().finally(() => db.$disconnect());
