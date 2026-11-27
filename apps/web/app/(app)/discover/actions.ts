"use server";

import { unstable_rethrow } from "next/navigation";
import { refresh } from "next/cache";
import { api, ApiError } from "@/lib/api";

type Report = Record<string, { fetched: number; added: number; updated: number; duplicates: number; invalid: number; error?: string }>;
export type RefreshState = { message: string; failed: boolean } | null;

const NAME: Record<string, string> = { devpost: "Devpost", mlh: "MLH", "my-list": "Malaysian list" };

/** Fetch every source now. Returns a one-line summary for the button. */
export async function refreshDiscovery(_prev: RefreshState): Promise<RefreshState> {
  try {
    const report = await api<Report>("/discovery/refresh", { method: "POST" });
    const added = Object.values(report).reduce((n, r) => n + r.added, 0);
    const failed = Object.entries(report).filter(([, r]) => r.error).map(([s]) => NAME[s] ?? s);
    refresh();
    const head = added === 0 ? "Nothing new" : `${added} new hackathon${added === 1 ? "" : "s"}`;
    return { message: failed.length ? `${head}. Couldn't reach ${failed.join(", ")}.` : `${head}.`, failed: failed.length > 0 };
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
    return { message: e instanceof ApiError ? e.message : "Refresh failed", failed: true };
  }
}

/** Interested moves the hackathon to the board; Skip hides it and keeps it from being rediscovered. */
export async function decide(formData: FormData) {
  const id = String(formData.get("id"));
  const stage = formData.get("stage") === "skipped" ? "skipped" : "interested";
  await api(`/hackathons/${encodeURIComponent(id)}/stage`, { method: "POST", body: JSON.stringify({ stage }) });
  refresh();
}
