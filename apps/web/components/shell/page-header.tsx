import type { ReactNode } from "react";
import { Fixtures } from "./fixtures";

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
      {/* ponytail: no data yet; phase 08 feeds the fixtures. */}
      <Fixtures items={[]} />
    </>
  );
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
