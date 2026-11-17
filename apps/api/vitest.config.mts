import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    pool: "forks",
    fileParallelism: false, // one SQLite file for all tests
    globalSetup: ["./test/global-setup.ts"],
    env: { DATABASE_URL: "file:./prisma/test.db" },
  },
  // SWC emits decorator metadata, which Nest's dependency injection needs.
  plugins: [swc.vite({ module: { type: "es6" } })],
});
