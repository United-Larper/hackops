import { STAGES } from "@hackops/shared";

// Placeholder until phase 01 builds the shell. Proves web → API → database and web → shared.
export const dynamic = "force-dynamic";

async function apiHealth(): Promise<string> {
  try {
    const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/health`, { cache: "no-store" });
    const body = (await res.json()) as { ok: boolean; db: string };
    return body.ok ? `API up, database ${body.db}` : "API answered but not ok";
  } catch {
    return "API not reachable. Start it with pnpm dev from the repo root.";
  }
}

export default async function Home() {
  return (
    <main className="mx-auto max-w-xl p-8 font-mono text-sm">
      <h1 className="text-lg font-semibold">HackOps scaffold</h1>
      <p className="mt-4">{await apiHealth()}</p>
      <p className="mt-2">Stages from @hackops/shared: {STAGES.join(" → ")}</p>
    </main>
  );
}
