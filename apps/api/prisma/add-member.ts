// Adds a member, or renames one that has this email. Members are added only here or in the database, never
// through the API. No password: they can't sign in until `pnpm --filter api set-password <email>`.
// Usage: pnpm --filter api add-member "Full Name" email@example.com
import { MemberInput } from "@hackops/shared";
import { pgAdapter } from "../src/db";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: pgAdapter() });

async function main() {
  const [name, email] = process.argv.slice(2);
  const input = MemberInput.parse({ name, email });
  if (!input.email) throw new Error('Usage: pnpm --filter api add-member "Full Name" email@example.com');
  const m = await db.member.upsert({ where: { email: input.email }, create: input, update: { name: input.name } });
  console.log(`${m.name} is a member.`);
}

main().finally(() => db.$disconnect());
