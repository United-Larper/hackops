// The discovery categories and their keywords. Real data, not demo: the seed and import-list both create them,
// so a database without the demo team (prod) still gets auto-categories.
import type { PrismaClient } from "../src/generated/prisma/client";

export const CATEGORIES = [
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

export async function upsertCategories(db: PrismaClient) {
  for (const [slug, name, keywords] of CATEGORIES) {
    const k = JSON.stringify(keywords);
    await db.category.upsert({ where: { slug }, create: { slug, name, keywords: k }, update: { name, keywords: k } });
  }
}
