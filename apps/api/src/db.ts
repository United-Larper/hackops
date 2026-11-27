import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

// apps/api/.env holds the Neon URLs locally. Variables already set (by Render, CI or the test config) win over the file.
const ENV_FILE = join(__dirname, "../.env");
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

/**
 * The Postgres adapter for every PrismaClient: the API, the seed and set-password. Uses Neon's pooled URL.
 * DATABASE_SCHEMA is set only by the tests ("test"); everything else uses "public".
 */
export function pgAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env and fill in the Neon URLs.");
  return new PrismaPg({ connectionString }, { schema: process.env.DATABASE_SCHEMA });
}
