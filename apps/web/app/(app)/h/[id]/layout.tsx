import type { Metadata } from "next";
import type { ReactNode } from "react";
import { nextDeadline, progressOf, type Stage, type WorkspaceDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { MatchClock } from "@/components/match-clock";
import { PageHeader } from "@/components/shell/page-header";
import { StageControl } from "@/components/workspace/stage-control";
import { Tabs } from "@/components/workspace/tabs";
import { clockTime, countdown, isUrgent, shortDate } from "@/lib/time";
import { getWorkspace, initials } from "@/lib/workspace";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await getWorkspace((await params).id)).title };
}

// Spec §5 names five lifecycle phases; Monitoring runs alongside Execution, so Building lights both.
const PHASES = ["Initiation", "Planning", "Execution", "Monitoring", "Closing"] as const;
const CURRENT: Record<Stage, number[]> = {
  discovered: [0], interested: [0], registered: [1], building: [2, 3], submitted: [4], results: [4], skipped: [],
};
const DUE: Record<string, string> = { registration: "Registration closes", submission: "Submission due", judging: "Judging" };

export default async function WorkspaceLayout({ params, children }: Props & { children: ReactNode }) {
  const { id } = await params;
  const h = await getWorkspace(id);
  const closing = h.stage === "submitted" || h.stage === "results";
  const tabs = [
    { href: "", label: "Overview" },
    { href: "/tasks", label: "Tasks" },
    { href: "/team", label: "Team & roles" },
    { href: "/timeline", label: "Timeline" },
    { href: "/activity", label: "Activity" },
    { href: "/links", label: "Links & submission" },
    ...(closing ? [{ href: "/retro", label: "Retro" }] : []),
  ];

  return (
    <>
      <PageHeader title={h.title} action={<StageControl id={h.id} title={h.title} stage={h.stage} decisionNote={h.decisionNote} />} />
      <section aria-label="Status" className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Deadline h={h} />
        <Progress h={h} />
        <p className="flex items-center gap-2 text-sm">
          {h.owner ? (
            <>
              <span className="grid size-8 place-items-center rounded-full bg-rail font-display text-xs font-bold text-rail-strong" aria-hidden>
                {initials(h.owner.name)}
              </span>
              <span>
                <span className="block text-xs text-muted">Owner</span>
                <span className="font-medium">{h.owner.name}</span>
              </span>
            </>
          ) : (
            <span>
              <span className="block text-xs text-muted">Owner</span>
              <span className="text-muted">Set an accountable person in Team &amp; roles</span>
            </span>
          )}
        </p>
        <Lifecycle stage={h.stage} />
      </section>
      <Tabs base={`/h/${h.id}`} tabs={tabs} />
      <div>{children}</div>
    </>
  );
}

function Deadline({ h }: { h: WorkspaceDto }) {
  const due = nextDeadline(h);
  if (!due) {
    return (
      <p className="text-sm">
        <span className="block text-xs text-muted">Next deadline</span>
        <span className="font-display text-2xl font-bold">{h.stage === "results" ? "Full time" : "None listed"}</span>
      </p>
    );
  }
  if (h.stage === "building" && due.kind === "submission") return <MatchClock to={due.at} tone="light" />;
  return (
    <p className="text-sm">
      <span className="block text-xs text-muted">{DUE[due.kind]}</span>
      <span className={`font-display text-2xl leading-none font-bold tabular-nums ${isUrgent(due.at) ? "text-live-text" : ""}`}>{countdown(due.at)}</span>{" "}
      <span className="text-[13px] text-muted">
        {shortDate(due.at)}, {clockTime(due.at)} MYT
      </span>
    </p>
  );
}

function Progress({ h }: { h: WorkspaceDto }) {
  const p = progressOf(h.tasks);
  if (!p.total) return null;
  return (
    <p className="w-40 text-sm">
      <span className="flex justify-between text-xs text-muted">
        Tasks done <span className="font-display text-sm font-bold text-text tabular-nums">{p.done}/{p.total}</span>
      </span>
      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-panel-2" aria-hidden>
        <span className="block h-full bg-text" style={{ width: `${Math.round((p.done / p.total) * 100)}%` }} />
      </span>
    </p>
  );
}

function Lifecycle({ stage }: { stage: Stage }) {
  const now = CURRENT[stage];
  const first = now[0] ?? -1;
  return (
    <div className="w-full max-w-xl md:ml-auto md:w-auto md:flex-1">
      <ol aria-label="Lifecycle" className="flex gap-1">
        {PHASES.map((p, i) => {
          const state = now.includes(i) ? "now" : i < first ? "done" : "next";
          return (
            <li key={p} className="min-w-0 flex-1" aria-current={state === "now" ? "step" : undefined}>
              <span className={`block h-1 rounded-full ${state === "now" ? "bg-text" : state === "done" ? "bg-muted" : "bg-line"}`} />
              <span
                className={`mt-1.5 flex items-center gap-1 truncate font-display text-[13px] font-bold tracking-[0.05em] uppercase max-sm:sr-only ${
                  state === "now" ? "text-text" : "text-muted"
                }`}
              >
                {state === "done" && <Icon name="check" size={12} />}
                {p}
              </span>
            </li>
          );
        })}
        {stage === "skipped" && <li className="self-end text-xs text-muted max-sm:hidden">Skipped</li>}
      </ol>
      {/* Phones: the five labels don't fit under their bars, so name the current phase once. */}
      <p aria-hidden className="mt-1.5 font-display text-[13px] font-bold tracking-[0.05em] uppercase sm:hidden">
        {now.length ? now.map((i) => PHASES[i]).join(" · ") : "Skipped"}
      </p>
    </div>
  );
}
