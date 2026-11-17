import { ROLES, type Role } from "./enums";

/**
 * What each category usually needs, as a plain-language need plus the skills that cover it.
 * ponytail: a hand-written heuristic; phase 10's past-winner analysis can replace it with evidence.
 */
export const CATEGORY_NEEDS: Record<string, { need: string; skills: string[] }[]> = {
  "ai-ml": [{ need: "Machine learning", skills: ["python", "ml", "machine learning", "pytorch", "tensorflow", "llm", "ai"] }],
  web3: [{ need: "Smart contracts", skills: ["solidity", "web3", "ethereum", "solana", "blockchain"] }],
  fintech: [{ need: "Backend and data", skills: ["python", "node", "node.js", "java", "go", "sql", "postgresql", "fastapi"] }],
  healthtech: [{ need: "Mobile app", skills: ["flutter", "react native", "swift", "kotlin", "android", "ios"] }],
  sustainability: [{ need: "Data analysis", skills: ["python", "pandas", "sql", "data", "gis"] }],
  edtech: [{ need: "Web front end", skills: ["react", "next.js", "vue", "svelte", "typescript", "javascript"] }],
  gaming: [{ need: "Game engine", skills: ["unity", "unreal", "godot", "game"] }],
  "smart-city": [{ need: "IoT or maps", skills: ["iot", "arduino", "raspberry pi", "maps", "gis"] }],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-word, case-insensitive: "ML Kit" covers "ml", "HTML" doesn't. */
const has = (skills: string[], wanted: string) => skills.some((s) => new RegExp(`(^|[^\\w])${escape(wanted)}($|[^\\w])`, "i").test(s));

export type SkillGaps = { roles: Role[]; skills: { category: string; need: string }[] };

/** Roles nobody on the team holds, and category needs no team member's skills cover. */
export function skillGaps(categories: string[], team: { role: Role; skills: string[] }[]): SkillGaps {
  const all = team.flatMap((m) => m.skills);
  return {
    roles: ROLES.filter((r) => !team.some((m) => m.role === r)),
    skills: categories.flatMap((category) =>
      (CATEGORY_NEEDS[category] ?? []).filter((n) => !n.skills.some((s) => has(all, s))).map((n) => ({ category, need: n.need })),
    ),
  };
}
