import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env")) process.loadEnvFile(".env");

// The CLI (migrate, db) needs Neon's direct URL: migrations take locks the pooler can't hold. The app uses the pooled
// DATABASE_URL through the adapter (src/db.ts). Without a direct URL set, e.g. on a plain Postgres, DATABASE_URL serves both.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
