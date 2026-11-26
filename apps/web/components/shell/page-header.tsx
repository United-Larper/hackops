import type { ReactNode } from "react";
import { DEADLINE_LABEL, type GroupedDueItem } from "@hackops/shared";
import { api } from "@/lib/api";
import { Fixtures, type Fixture } from "./fixtures";

/**
 * Page title in condensed display type, optional filters, primary action on the right,
 * then this week's fixtures (the due-soon slot) on every app page.
 */
export function PageHeader({ title, filters, action }: { title: string; filters?: ReactNode; action?: ReactNode }) {
  return (
    <>
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1 className="font-display text-[34px] leading-none font-bold tracking-[-0.01em] sm:text-[40px]">{title}</h1>
        {filters && <div className="flex flex-wrap gap-2">{filters}</div>}
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <DueSoon />
    </>
  );
}

const toFixture = (d: GroupedDueItem): Fixture => ({
  id: d.id,
  at: d.at,
  group: d.group,
  event: d.task ?? d.hackathon, // phones show only this column, so a task row names the task
  what: d.task ? `${DEADLINE_LABEL.task} · ${d.hackathon}` : DEADLINE_LABEL[d.kind],
  href: d.task ? `/h/${d.hackathonId}/tasks` : d.kind === "check" ? `/h/${d.hackathonId}/links` : `/h/${d.hackathonId}`,
});

/** The next 7 days' deadlines. If the API is down the panel says so instead of failing the page. */
async function DueSoon() {
  const items = await api<GroupedDueItem[]>("/deadlines?days=7").catch((e: unknown) => {
    console.error("Due-soon panel:", e);
    return null;
  });
  return <Fixtures items={items && items.map(toFixture)} />;
}

/** What an empty page or column shows: what will appear here, and where it comes from. */
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-line px-6 py-10 sm:px-10">
      <p className="font-display text-2xl font-bold">{title}</p>
      <div className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}
