export const SOURCES = ["devpost", "mlh", "my-list", "demo"] as const;
export type Source = (typeof SOURCES)[number];

export const MODES = ["online", "in_person", "hybrid"] as const;
export type Mode = (typeof MODES)[number];

export const ROLES = ["lead", "developer", "designer", "pitch"] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const RESULTS = ["won", "finalist", "participated"] as const;
export type HackathonResult = (typeof RESULTS)[number];

export const REGIONS = ["malaysia", "overseas", "online"] as const;
export type Region = (typeof REGIONS)[number];

/** Online events are their own region; otherwise Malaysia or not. */
export function regionOf(h: { mode: string; country: string | null }): Region {
  if (h.mode === "online") return "online";
  return h.country?.trim().toLowerCase() === "malaysia" ? "malaysia" : "overseas";
}

/** The one team. Each hackathon's lineup is its assignments, not another team row. */
export const TEAM_ID = "team";

/** Discovery categories: a hackathon stores their slugs; keywords drive auto-categories. Changing one needs a deploy. */
export const CATEGORIES = [
  { slug: "ai-ml", name: "AI / ML", keywords: ["ai", "machine learning", "llm", "agent", "genai", "gemini", "openai"] },
  { slug: "web3", name: "Web3", keywords: ["web3", "blockchain", "crypto", "ethereum", "solana", "defi"] },
  { slug: "fintech", name: "FinTech", keywords: ["fintech", "finance", "payments", "banking", "insurtech"] },
  { slug: "healthtech", name: "HealthTech", keywords: ["health", "medical", "healthcare", "wellbeing"] },
  { slug: "sustainability", name: "Sustainability", keywords: ["climate", "sustainability", "green", "energy", "environment", "esg"] },
  { slug: "edtech", name: "EdTech", keywords: ["education", "edtech", "e-learning", "teaching", "school"] },
  { slug: "gaming", name: "Gaming", keywords: ["game", "gaming", "unity", "unreal"] },
  { slug: "smart-city", name: "Smart City", keywords: ["smart city", "mobility", "transport", "iot", "urban"] },
  { slug: "open", name: "Open theme", keywords: ["open theme", "open innovation", "any track"] },
  { slug: "student", name: "Student only", keywords: ["student", "university", "undergraduate"] },
  { slug: "corporate", name: "Corporate", keywords: ["corporate", "enterprise", "company"] },
] as const;

/** Slugs to { slug, name }, in CATEGORIES order. A slug no longer in CATEGORIES shows as itself. */
export function categoryRefs(slugs: readonly string[]) {
  const known = CATEGORIES.filter((c) => slugs.includes(c.slug)).map((c) => ({ slug: c.slug, name: c.name }));
  const unknown = slugs.filter((s) => !CATEGORIES.some((c) => c.slug === s)).map((s) => ({ slug: s, name: s }));
  return [...known, ...unknown];
}
