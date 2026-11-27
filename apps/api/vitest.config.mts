import { existsSync } from "node:fs";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) process.loadEnvFile(".env");
// The tests run in their own "test" schema of the dev database and wipe only that schema (test/global-setup.ts).
// The app's tables are in "public", so dev data is left alone. Direct URL: the pooler can't hold migration locks.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED in apps/api/.env (the Neon dev branch's direct URL).");

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    pool: "forks",
    fileParallelism: false, // one database for all tests
    globalSetup: ["./test/global-setup.ts"],
    env: { DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, DATABASE_SCHEMA: "test" },
  },
  // SWC emits decorator metadata, which Nest's dependency injection needs.
  plugins: [swc.vite({ module: { type: "es6" } })],
});
