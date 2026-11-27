// Imports a hand-kept list into whichever database DATABASE_URL points at, the same way the discovery refresh does
// (schema check, update by sourceId, duplicate check, auto-categories). Only the list: Devpost and MLH aren't fetched.
// The list can stay out of git: data/*.local.json is ignored, and the committed my-hackathons.json ships empty.
// Usage: pnpm --filter api import-list [file]   (default: data/my-hackathons.local.json)
import { resolve } from "node:path";
import { PrismaService } from "../src/prisma.service";
import { DiscoveryService } from "../src/discovery/refresh";
import { fetchMyList } from "../src/discovery/my-list";

const file = resolve(process.argv[2] ?? "data/my-hackathons.local.json");
const db = new PrismaService();

async function main() {
  const host = new URL(process.env.DATABASE_URL!).host;
  console.log(`Importing ${file} into ${host}`);
  const report = await new DiscoveryService(db).refresh({ "my-list": () => fetchMyList(file) });
  console.log(report["my-list"]);
  if (report["my-list"].error) process.exitCode = 1;
}

main().finally(() => db.$disconnect());
