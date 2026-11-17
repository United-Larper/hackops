import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// A fresh SQLite file with every migration applied, shared by the test files (they run one at a time).
export default function setup() {
  rmSync("prisma/test.db", { force: true });
  execSync("pnpm exec prisma migrate deploy", { env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" }, stdio: "ignore" });
}
