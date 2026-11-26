import { BOARD_STAGES, WATCH, type Deadline } from "./board";
import type { Stage } from "./lifecycle";
import { ACTIVE_STAGES } from "./workload";

type When = Date | string | null;
type HackathonDates = { id: string; title: string; stage: string; registrationClosesAt: When; submissionDueAt: When; judgingAt: When };
type TaskDue = { id: string; title: string; status: string; dueAt: When; hackathonId: string };

export type DueItem = {
  id: string; // stable: `${hackathonId}:${kind}` or `task:${taskId}`
  kind: Deadline["kind"] | "task" | "check"; // "check": a failing pre-submission check, listed at the submission deadline
  at: string; // ISO, UTC
  hackathonId: string;
  hackathon: string;
  task: string | null;
};
export type DueGroup = "today" | "tomorrow" | "week";
export type GroupedDueItem = DueItem & { group: DueGroup };

export const DEADLINE_LABEL: Record<DueItem["kind"], string> = {
  registration: "Registration closes",
  submission: "Submission due",
  judging: "Judging",
  task: "Task due",
  check: "Pre-submission check failing",
};

const isIn = (list: readonly string[], v: string) => list.includes(v);

/**
 * Every in-scope deadline, any date, soonest first. Board stages only, with the deadlines `WATCH` names for the stage;
 * tasks count when not done, dated, and on a Registered or Building hackathon.
 */
export function dueItems(hackathons: HackathonDates[], tasks: TaskDue[]): DueItem[] {
  const byId = new Map(hackathons.map((h) => [h.id, h]));
  const items: DueItem[] = [];
  for (const h of hackathons) {
    if (!isIn(BOARD_STAGES, h.stage)) continue;
    const at = { registration: h.registrationClosesAt, submission: h.submissionDueAt, judging: h.judgingAt };
    for (const kind of WATCH[h.stage as Stage]) {
      const when = at[kind];
      if (when) items.push({ id: `${h.id}:${kind}`, kind, at: new Date(when).toISOString(), hackathonId: h.id, hackathon: h.title, task: null });
    }
  }
  for (const t of tasks) {
    const h = byId.get(t.hackathonId);
    if (!h || !t.dueAt || t.status === "done" || !isIn(ACTIVE_STAGES, h.stage)) continue;
    items.push({ id: `task:${t.id}`, kind: "task", at: new Date(t.dueAt).toISOString(), hackathonId: h.id, hackathon: h.title, task: t.title });
  }
  return items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

const mytDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }); // YYYY-MM-DD in MYT
const DAY = 86_400_000;

/**
 * In-scope deadlines from now until `days` from now, grouped by MYT calendar day. A Registered or Building hackathon in
 * `failingChecks` (its last pre-submission check failed) also gets a "check" item at its submission deadline.
 */
export function upcomingDeadlines(hackathons: HackathonDates[], tasks: TaskDue[], now: Date, days: number, failingChecks: string[] = []): GroupedDueItem[] {
  const from = now.getTime();
  const today = mytDay.format(from);
  const tomorrow = mytDay.format(from + DAY); // MYT has no daylight saving
  const checks: DueItem[] = hackathons
    .filter((h) => failingChecks.includes(h.id) && h.submissionDueAt && isIn(ACTIVE_STAGES, h.stage))
    .map((h) => ({ id: `${h.id}:check`, kind: "check", at: new Date(h.submissionDueAt!).toISOString(), hackathonId: h.id, hackathon: h.title, task: null }));
  return [...dueItems(hackathons, tasks), ...checks]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .filter((i) => Date.parse(i.at) >= from && Date.parse(i.at) < from + days * DAY)
    .map((i) => {
      const d = mytDay.format(Date.parse(i.at));
      return { ...i, group: d === today ? "today" : d === tomorrow ? "tomorrow" : "week" };
    });
}
