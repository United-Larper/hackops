import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import type { CheckItem, SubmissionCheckDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { api, ApiError } from "@/lib/api";
import { recheck } from "@/lib/actions";
import { clockTime } from "@/lib/time";

// Pass, fail and can't-tell each carry an icon and a word, never colour alone. Signal red stays reserved for deadlines.
const MARK = {
  pass: { icon: "check", word: "Pass", cls: "bg-won text-on-won" },
  fail: { icon: "x", word: "Fail", cls: "bg-text text-ground" },
  unknown: { icon: "warning-circle", word: "Can't tell", cls: "border border-line-strong text-muted" },
} as const;
const state = (i: CheckItem) => (i.ok === true ? "pass" : i.ok === false ? "fail" : "unknown");

function Panel({ children, meta, busy }: { children: ReactNode; meta?: ReactNode; busy?: boolean }) {
  return (
    <section aria-labelledby="check-h" aria-busy={busy || undefined} className="rounded-[10px] border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="check-h" className="font-display text-xl font-bold">Pre-submission check</h2>
          {meta && <p className="mt-0.5 text-[13px] text-muted">{meta}</p>}
        </div>
        <form action={recheck}>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground">
            <Icon name="arrow-clockwise" size={16} />
            Check again
          </button>
        </form>
      </div>
      {children}
    </section>
  );
}

export function CheckLoading() {
  return (
    <Panel busy meta="Checking the repository, README, video and demo links">
      <p className="px-4 py-4 text-[15px] text-muted sm:px-5">Each link gets up to 10 seconds to answer.</p>
    </Panel>
  );
}

/** Runs the check on every render of the tab; it also runs on its own in the 6 hours before the submission deadline. */
export async function SubmissionCheck({ id }: { id: string }) {
  let c: SubmissionCheckDto;
  try {
    c = await api<SubmissionCheckDto>(`/hackathons/${encodeURIComponent(id)}/check`);
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
    return (
      <Panel>
        <p className="px-4 py-4 text-[15px] text-muted sm:px-5">{e instanceof ApiError ? e.message : "The check didn't run."}</p>
      </Panel>
    );
  }
  const passed = c.items.filter((i) => i.ok === true).length;
  return (
    <Panel
      meta={
        <>
          <span className="font-display text-base font-bold text-text tabular-nums">{passed}</span> of{" "}
          <span className="font-display text-base font-bold text-text tabular-nums">{c.items.length}</span> pass · checked{" "}
          <span className="font-display text-base font-bold text-text tabular-nums">{clockTime(c.checkedAt)}</span> MYT
        </>
      }
    >
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {c.items.map((i) => {
          const m = MARK[state(i)];
          return (
            <li key={i.key} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 px-4 py-3 sm:grid-cols-[28px_200px_minmax(0,1fr)] sm:items-center sm:px-5">
              <span className={`grid size-7 place-items-center rounded-[3px] ${m.cls}`}>
                <Icon name={m.icon} size={16} label={m.word} />
              </span>
              <span className="text-[15px] font-semibold">{i.label}</span>
              <span className="col-start-2 text-[13px] text-muted sm:col-start-auto sm:text-sm">{i.detail}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
