import { execSync } from "node:child_process";
import { Client } from "pg";

// An empty "test" schema with every migration applied, shared by the test files (they run one at a time).
// Only this schema is dropped: the app's own tables live in "public".
const SCHEMA = "test";

export default async function setup() {
  const url = process.env.DATABASE_URL_UNPOOLED!;
  const db = new Client({ connectionString: url });
  await db.connect();
  await db.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE; CREATE SCHEMA "${SCHEMA}";`);
  await db.end();
  const migrateUrl = new URL(url);
  migrateUrl.searchParams.set("schema", SCHEMA); // Prisma Migrate creates the tables in this schema
  execSync("pnpm exec prisma migrate deploy", { env: { ...process.env, DATABASE_URL_UNPOOLED: migrateUrl.href }, stdio: "ignore" });
}
