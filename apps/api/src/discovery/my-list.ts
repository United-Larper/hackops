import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HackathonInput, type ScrapedHackathon } from "@hackops/shared";
import { z } from "zod";

// The curated Malaysian list: local events (MDEC, Cradle, universities, GDG, AWS user groups) rarely have a feed,
// so the team adds them to apps/api/data/my-hackathons.json. Each entry needs a stable "sourceId".

export const MY_LIST_PATH = join(__dirname, "../../data/my-hackathons.json");

const Entry = HackathonInput.omit({ source: true, categories: true }).extend({
  sourceId: z.string().trim().min(1).max(200),
  themes: z.array(z.string()).default([]),
});

export async function fetchMyList(path = MY_LIST_PATH): Promise<ScrapedHackathon[]> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  return z.array(Entry).parse(raw).map((e) => ({ ...e, source: "my-list" as const }));
}
