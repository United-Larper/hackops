"use server";

import { refresh } from "next/cache";
import type { HackathonResult, Stage } from "@hackops/shared";
import { api, ApiError } from "@/lib/api";

export type MoveResult = { error?: string };

/**
 * Move a card through POST /hackathons/:id/stage so the stage side effects run (task template, result rule, activity).
 * A Decide note (register or skip) is also kept as the decision note shown on the workspace overview.
 */
export async function moveCard(id: string, stage: Stage, opts: { result?: HackathonResult; note?: string } = {}): Promise<MoveResult> {
  const path = `/hackathons/${encodeURIComponent(id)}`;
  const note = opts.note?.trim() || undefined;
  try {
    // Note first: if the move then fails, nothing has moved and the error is accurate.
    if (note && (stage === "registered" || stage === "skipped")) {
      await api(path, { method: "PATCH", body: JSON.stringify({ decisionNote: note }) });
    }
    await api(`${path}/stage`, { method: "POST", body: JSON.stringify({ stage, result: opts.result, note }) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "The move didn't save." };
  }
  refresh();
  return {};
}
