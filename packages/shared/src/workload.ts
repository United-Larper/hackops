import type { Role } from "./enums";
import type { Stage } from "./lifecycle";
import type { MemberRefDto } from "./dto";

/** Stages where a hackathon takes up the team's time. */
export const ACTIVE_STAGES = ["registered", "building"] as const satisfies readonly Stage[];

type When = Date | string | null;
export type Span = { startsAt: When; endsAt: When; submissionDueAt: When };

/** A hackathon's dates as [start, end] ms: the end falls back to the submission deadline, a lone date is a single moment. */
function range(s: Span): [number, number] | null {
  const t = (d: When) => (d ? new Date(d).getTime() : null);
  const end = t(s.endsAt) ?? t(s.submissionDueAt) ?? t(s.startsAt);
  const start = t(s.startsAt) ?? end;
  return start === null || end === null ? null : [start, end];
}

/** Whether two hackathons' dates share any moment (touching ends count). Unknown dates never overlap. */
export function overlaps(a: Span, b: Span): boolean {
  const x = range(a);
  const y = range(b);
  return Boolean(x && y && x[0] <= y[1] && y[0] <= x[1]);
}

export type WorkloadRow = {
  member: MemberRefDto;
  /** Active hackathons this member is on, with their role. */
  hackathons: { id: string; role: Role; accountable: boolean }[];
  /** Tasks not done, assigned to this member, on active hackathons. */
  openTasks: number;
  /** Pairs of this member's active hackathons whose dates overlap. */
  clashes: [string, string][];
};

/** Per member: active hackathons (Registered or Building), open tasks on them, and date clashes between them. */
export function workload(
  members: MemberRefDto[],
  hackathons: (Span & { id: string; stage: string; assignments: { memberId: string; role: Role; accountable: boolean }[] })[],
  tasks: { hackathonId: string; assigneeId: string | null; status: string }[],
): WorkloadRow[] {
  const active = hackathons.filter((h) => (ACTIVE_STAGES as readonly string[]).includes(h.stage));
  const activeIds = new Set(active.map((h) => h.id));
  return members.map((m) => {
    const mine = active.flatMap((h) => h.assignments.filter((a) => a.memberId === m.id).map((a) => ({ h, a })));
    return {
      member: { id: m.id, name: m.name },
      hackathons: mine.map(({ h, a }) => ({ id: h.id, role: a.role, accountable: a.accountable })),
      openTasks: tasks.filter((t) => t.assigneeId === m.id && t.status !== "done" && activeIds.has(t.hackathonId)).length,
      clashes: mine.flatMap(({ h }, i) => mine.slice(i + 1).filter((o) => overlaps(h, o.h)).map((o): [string, string] => [h.id, o.h.id])),
    };
  });
}

/** GET /team/workload: active hackathons (soonest first) and one row per member. Feeds the workload bars and the responsibility grid. */
export type TeamWorkloadDto = {
  hackathons: { id: string; title: string; stage: Stage; startsAt: string | null; endsAt: string | null; submissionDueAt: string | null }[];
  members: WorkloadRow[];
};
