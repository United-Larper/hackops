import type { TaskStatus } from "./enums";
import type { Stage } from "./lifecycle";
import type { HackathonDto } from "./dto";

/** Board columns in order. `discovered` lives in Discover; `skipped` shows only behind a filter. */
export const BOARD_STAGES = ["interested", "registered", "building", "submitted", "results"] as const satisfies readonly Stage[];

export type Progress = { done: number; total: number };
export type Deadline = { kind: "registration" | "submission" | "judging"; at: string };
export type BoardCardDto = HackathonDto & { progress: Progress; nextDeadline: Deadline | null };
/** GET /hackathons/board: cards per stage; `skipped` is present only when asked for. */
export type BoardDto = Record<(typeof BOARD_STAGES)[number], BoardCardDto[]> & { skipped?: BoardCardDto[] };

export function progressOf(tasks: { status: TaskStatus | string }[]): Progress {
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
}

type When = Date | string | null;
/** Which deadlines matter at each stage. */
export const WATCH: Record<Stage, Deadline["kind"][]> = {
  discovered: ["registration", "submission"],
  interested: ["registration", "submission"],
  registered: ["submission"],
  building: ["submission"],
  submitted: ["judging"],
  results: [],
  skipped: [],
};

/** The earliest deadline still ahead that matters at this stage, or null. */
export function nextDeadline(
  h: { stage: Stage; registrationClosesAt: When; submissionDueAt: When; judgingAt: When },
  now = new Date(),
): Deadline | null {
  const at = { registration: h.registrationClosesAt, submission: h.submissionDueAt, judging: h.judgingAt };
  const ahead = WATCH[h.stage]
    .map((kind) => ({ kind, t: at[kind] ? new Date(at[kind]).getTime() : NaN }))
    .filter((d) => d.t > now.getTime())
    .sort((a, b) => a.t - b.t)[0];
  return ahead ? { kind: ahead.kind, at: new Date(ahead.t).toISOString() } : null;
}
