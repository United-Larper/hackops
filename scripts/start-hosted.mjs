// Runs HackOps as one hosted service (Render): migrations, then the API on 127.0.0.1:4000 and the web app on $PORT.
// The API stays unreachable from outside, as on one machine (README, Hosting). If either process stops, both stop
// and the host restarts the service.
import { execFileSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const api = join(root, "apps/api");
const web = join(root, "apps/web");
const bin = (dir, name) => join(dir, "node_modules/.bin", name);

execFileSync(bin(api, "prisma"), ["migrate", "deploy"], { cwd: api, stdio: "inherit" });

const children = [
  // PORT here is the API's own: the host's PORT belongs to the web app.
  spawn(process.execPath, ["dist/main.js"], { cwd: api, stdio: "inherit", env: { ...process.env, PORT: "4000", HOST: "127.0.0.1" } }),
  spawn(bin(web, "next"), ["start", "-p", process.env.PORT ?? "3200", "-H", "0.0.0.0"], {
    cwd: web,
    stdio: "inherit",
    env: { ...process.env, API_URL: "http://127.0.0.1:4000" },
  }),
];

let stopping = false;
const stopAll = (code) => {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill("SIGTERM");
  process.exitCode = code;
};
for (const c of children) c.on("exit", (code) => stopAll(code ?? 1));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => stopAll(0));
