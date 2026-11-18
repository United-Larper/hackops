// Demo data: a fictional team and fictional hackathons, dated relative to now so the demo
// always has live deadlines. Every hackathon here has source "demo" so later screens can label it.
// Safe to run repeatedly: rows are upserted by fixed keys and demo tasks/assignments are rebuilt.
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { templateTasks } from "@hackops/shared";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) });
const now = Date.now();
const at = (hours: number) => new Date(now + hours * 3_600_000);
const days = (d: number) => at(d * 24);
const json = (v: unknown) => JSON.stringify(v);

const CATEGORIES = [
  ["ai-ml", "AI / ML", ["ai", "machine learning", "llm", "agent", "genai", "gemini", "openai"]],
  ["web3", "Web3", ["web3", "blockchain", "crypto", "ethereum", "solana", "defi"]],
  ["fintech", "FinTech", ["fintech", "finance", "payments", "banking", "insurtech"]],
  ["healthtech", "HealthTech", ["health", "medical", "healthcare", "wellbeing"]],
  ["sustainability", "Sustainability", ["climate", "sustainability", "green", "energy", "environment", "esg"]],
  ["edtech", "EdTech", ["education", "edtech", "e-learning", "teaching", "school"]],
  ["gaming", "Gaming", ["game", "gaming", "unity", "unreal"]],
  ["smart-city", "Smart City", ["smart city", "mobility", "transport", "iot", "urban"]],
  ["open", "Open theme", ["open theme", "open innovation", "any track"]],
  ["student", "Student only", ["student", "university", "undergraduate"]],
  ["corporate", "Corporate", ["corporate", "enterprise", "company"]],
] as const;

const MEMBERS = [
  { id: "m-aina", name: "Aina Rahman", skills: ["React", "TypeScript", "UI design"], preferredRoles: ["lead", "designer"], organisation: "Universiti Malaya", tshirtSize: "S" },
  { id: "m-weijie", name: "Tan Wei Jie", skills: ["Python", "FastAPI", "PostgreSQL"], preferredRoles: ["developer"], organisation: "Grab (intern)", tshirtSize: "L" },
  { id: "m-harish", name: "Harish Kumar", skills: ["Flutter", "Firebase", "ML Kit"], preferredRoles: ["developer", "pitch"], organisation: "Universiti Teknologi Malaysia", tshirtSize: "M" },
  { id: "m-sofia", name: "Sofia Lim", skills: ["Product", "Figma", "Public speaking"], preferredRoles: ["pitch", "designer"], organisation: "Freelance", tshirtSize: "M", dietary: "Vegetarian" },
] as const;

const PROJECTS = [
  { id: "p-kedaikira", name: "Kedai Kira", description: "Bookkeeping by WhatsApp voice note for small kedai owners.", tech: ["Python", "Whisper", "React"], repoUrl: "https://github.com/example/kedai-kira" },
  { id: "p-banjir", name: "Banjir Watch", description: "Flood alerts from open river-level data, sent by Telegram.", tech: ["Flutter", "Firebase", "Open data"], repoUrl: "https://github.com/example/banjir-watch" },
  { id: "p-learnlah", name: "LearnLah", description: "Bite-size SPM revision cards generated from past papers.", tech: ["Next.js", "OpenAI", "PostgreSQL"], repoUrl: "https://github.com/example/learnlah" },
] as const;

type Seed = {
  key: string;
  title: string;
  organizer: string;
  mode: "online" | "in_person" | "hybrid";
  city?: string;
  country?: string;
  stage: string;
  categories: string[];
  startsAt?: Date;
  endsAt?: Date;
  registrationClosesAt?: Date;
  submissionDueAt?: Date;
  judgingAt?: Date;
  prizeAmount?: number;
  prizeCurrency?: string;
  teamSizeMax?: number;
  prizeTracks?: { name: string; sponsor?: string; prize?: string }[];
  owner?: string;
  project?: string;
  result?: string;
  decisionNote?: string;
  team?: [string, string, boolean][];
  doneTasks?: number;
};

const HACKATHONS: Seed[] = [
  { key: "tokyo-robotics", title: "Tokyo Robotics Open", organizer: "Robotics Society", mode: "in_person", city: "Tokyo", country: "Japan", stage: "discovered", categories: ["ai-ml"], registrationClosesAt: days(20), startsAt: days(34), endsAt: days(36), prizeAmount: 1000000, prizeCurrency: "JPY", teamSizeMax: 4 },
  { key: "web3-builders", title: "Web3 Builders Cup", organizer: "Chain Collective", mode: "online", stage: "discovered", categories: ["web3"], registrationClosesAt: days(15), submissionDueAt: days(30), prizeAmount: 25000, prizeCurrency: "USD", teamSizeMax: 5 },
  { key: "cyberjaya-cloud", title: "Cyberjaya Cloud Hack", organizer: "Cyberjaya Developer Circle", mode: "in_person", city: "Cyberjaya", country: "Malaysia", stage: "discovered", categories: ["ai-ml", "corporate"], registrationClosesAt: days(18), startsAt: days(28), endsAt: days(29), prizeAmount: 25000, prizeCurrency: "MYR", teamSizeMax: 4 },
  { key: "penang-game-jam", title: "Penang Youth Game Jam", organizer: "Penang Creative Youth", mode: "hybrid", city: "George Town", country: "Malaysia", stage: "discovered", categories: ["gaming", "student"], registrationClosesAt: days(25), startsAt: days(32), endsAt: days(34), prizeAmount: 6000, prizeCurrency: "MYR", teamSizeMax: 5 },
  { key: "borneo-climate", title: "Borneo Climate Jam 2026", organizer: "Sarawak Digital Youth", mode: "in_person", city: "Kuching", country: "Malaysia", stage: "interested", categories: ["sustainability", "student"], registrationClosesAt: days(12), startsAt: days(19), endsAt: days(21), prizeAmount: 15000, prizeCurrency: "MYR", teamSizeMax: 5 },
  { key: "fintech-sprint", title: "FinTech Sprint KL", organizer: "KL Fintech Network", mode: "hybrid", city: "Kuala Lumpur", country: "Malaysia", stage: "interested", categories: ["fintech", "web3"], registrationClosesAt: days(3), startsAt: days(16), endsAt: days(17), prizeAmount: 20000, prizeCurrency: "MYR", teamSizeMax: 4, prizeTracks: [{ name: "Best use of open banking APIs", sponsor: "Demo Bank", prize: "RM 5,000" }, { name: "Best student team", prize: "RM 2,000" }] },
  { key: "selangor-smart-city", title: "Selangor Smart City Hack", organizer: "Selangor Innovation Hub", mode: "in_person", city: "Shah Alam", country: "Malaysia", stage: "registered", categories: ["smart-city", "open"], registrationClosesAt: at(3.7), startsAt: days(11), endsAt: days(12), submissionDueAt: at(12 * 24 + 6), prizeAmount: 30000, prizeCurrency: "MYR", teamSizeMax: 4, owner: "m-aina", decisionNote: "Strong fit for Banjir Watch's data pipeline; close to home.", team: [["m-aina", "lead", true], ["m-weijie", "developer", false]] },
  { key: "penang-health", title: "Penang Health Hack", organizer: "Penang Medical Innovators", mode: "in_person", city: "George Town", country: "Malaysia", stage: "registered", categories: ["healthtech"], registrationClosesAt: days(-2), startsAt: at(4.5 * 24), endsAt: days(6), submissionDueAt: at(6 * 24 - 4), prizeAmount: 12000, prizeCurrency: "MYR", teamSizeMax: 4, owner: "m-harish", team: [["m-harish", "lead", true], ["m-sofia", "pitch", false]] },
  { key: "global-ai-agents", title: "Global AI Agents Challenge", organizer: "Agents Guild", mode: "online", stage: "building", categories: ["ai-ml", "open"], registrationClosesAt: days(-10), startsAt: days(-5), submissionDueAt: at(66.2), judgingAt: days(10), prizeAmount: 50000, prizeCurrency: "USD", teamSizeMax: 4, owner: "m-sofia", project: "p-learnlah", prizeTracks: [{ name: "Best education agent", prize: "US$5,000" }, { name: "Best use of open-source models", prize: "US$3,000" }], team: [["m-sofia", "lead", true], ["m-aina", "designer", false], ["m-harish", "developer", false]], doneTasks: 4 },
  { key: "um-code-for-good", title: "UM Code for Good", organizer: "UM Computing Society", mode: "in_person", city: "Kuala Lumpur", country: "Malaysia", stage: "submitted", categories: ["edtech", "student"], startsAt: days(-4), endsAt: days(-3), submissionDueAt: days(-3), judgingAt: days(9), prizeAmount: 5000, prizeCurrency: "MYR", owner: "m-weijie", project: "p-learnlah", team: [["m-weijie", "lead", true], ["m-aina", "developer", false]], doneTasks: 7 },
  { key: "johor-dev-fest", title: "Johor Dev Fest Hack", organizer: "Johor Developers", mode: "in_person", city: "Johor Bahru", country: "Malaysia", stage: "results", categories: ["fintech", "open"], startsAt: days(-32), endsAt: days(-31), submissionDueAt: days(-31), prizeAmount: 8000, prizeCurrency: "MYR", owner: "m-weijie", project: "p-kedaikira", result: "won", team: [["m-weijie", "lead", true], ["m-harish", "developer", false], ["m-sofia", "pitch", false]], doneTasks: 7 },
  { key: "asean-open-data", title: "ASEAN Open Data Jam", organizer: "Open Data SEA", mode: "in_person", city: "Singapore", country: "Singapore", stage: "results", categories: ["sustainability", "smart-city"], startsAt: days(-60), endsAt: days(-58), submissionDueAt: days(-58), prizeAmount: 10000, prizeCurrency: "SGD", owner: "m-harish", project: "p-banjir", result: "finalist", team: [["m-harish", "lead", true], ["m-aina", "developer", false]], doneTasks: 7 },
  { key: "arctic-quantum", title: "Arctic Quantum Hack", organizer: "Nordic Quantum Lab", mode: "in_person", city: "Tromsø", country: "Norway", stage: "skipped", categories: ["corporate"], registrationClosesAt: days(5), prizeAmount: 5000, prizeCurrency: "EUR", decisionNote: "Travel cost too high for the prize; no quantum experience on the team." },
];

async function main() {
  for (const [slug, name, keywords] of CATEGORIES) {
    await db.category.upsert({ where: { slug }, create: { slug, name, keywords: json(keywords) }, update: { name, keywords: json(keywords) } });
  }
  for (const m of MEMBERS) {
    const data = { ...m, skills: json(m.skills), preferredRoles: json(m.preferredRoles) };
    await db.member.upsert({ where: { id: m.id }, create: data, update: data });
  }
  for (const p of PROJECTS) {
    const data = { ...p, tech: json(p.tech) };
    await db.project.upsert({ where: { id: p.id }, create: data, update: data });
  }
  const team = { name: "Kopi & Commit", pitch: "Four friends from KL who ship in a weekend.", preferredTech: json(["TypeScript", "Python", "Flutter", "AI"]), preferredCats: json(["ai-ml", "fintech", "smart-city", "edtech"]), homeCity: "Kuala Lumpur" };
  await db.team.upsert({ where: { id: "team" }, create: team, update: team });

  for (const h of HACKATHONS) {
    const { key, categories, owner, project, team: assigned, doneTasks, prizeTracks, ...fields } = h;
    const data = {
      ...fields,
      url: `https://example.com/hackathons/${key}`,
      prizeTracks: json(prizeTracks ?? []),
      ownerId: owner ?? null,
      projectId: project ?? null,
      categories: { set: categories.map((slug) => ({ slug })) },
    };
    const row = await db.hackathon.upsert({
      where: { source_sourceId: { source: "demo", sourceId: key } },
      create: { ...data, source: "demo", sourceId: key, categories: { connect: categories.map((slug) => ({ slug })) } },
      update: data,
    });

    await db.task.deleteMany({ where: { hackathonId: row.id } });
    await db.assignment.deleteMany({ where: { hackathonId: row.id } });
    await db.activity.deleteMany({ where: { hackathonId: row.id } });

    if (["registered", "building", "submitted", "results"].includes(h.stage)) {
      const lead = assigned?.[0]?.[0] ?? null;
      await db.task.createMany({
        data: templateTasks(h.submissionDueAt ?? null, h.submissionDueAt && h.submissionDueAt < new Date() ? new Date(0) : new Date()).map((t, i) => ({
          ...t,
          hackathonId: row.id,
          status: i < (doneTasks ?? 0) ? "done" : i === (doneTasks ?? 0) && h.stage === "building" ? "doing" : "todo",
          assigneeId: assigned?.[i % assigned.length]?.[0] ?? lead,
        })),
      });
    }
    if (assigned) {
      await db.assignment.createMany({ data: assigned.map(([memberId, role, accountable]) => ({ hackathonId: row.id, memberId, role, accountable })) });
    }
    await db.activity.create({ data: { hackathonId: row.id, kind: "change", text: `Added from the demo seed at stage ${h.stage}` } });
    if (h.decisionNote) await db.activity.create({ data: { hackathonId: row.id, kind: "note", text: h.decisionNote, memberId: owner ?? null } });
  }

  const counts = { hackathons: await db.hackathon.count(), members: await db.member.count(), projects: await db.project.count(), tasks: await db.task.count() };
  console.log("Seeded", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
