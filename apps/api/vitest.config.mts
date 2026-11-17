import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"], pool: "forks" },
  // SWC emits decorator metadata, which Nest's dependency injection needs.
  plugins: [swc.vite({ module: { type: "es6" } })],
});
