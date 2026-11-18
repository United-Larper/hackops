import Link from "next/link";
import type { DueGroup } from "@hackops/shared";
import { clockTime, countdown, dayName, dayOfMonth, isUrgent, monthName } from "@/lib/time";
import { Icon } from "../icon";

export type Fixture = {
  id: string;
  at: string; // ISO, UTC
  group: DueGroup;
  event: string;
  what: string; // "Registration closes", "Task due · Record demo", …
  href: string;
};

const GROUP_LABEL: Record<DueGroup, string> = { today: "Today", tomorrow: "Tomorrow", week: "This week" };
const SHOWN = 5; // the rest fold behind "N more" so the panel never pushes the page's own content off screen

function row(items: Fixture[], f: Fixture, i: number, now: Date) {
  const urgent = isUrgent(f.at, now);
  return (
    <li key={f.id} className={i > 0 ? "max-sm:hidden" : ""}>
      {f.group !== items[i - 1]?.group && (
        <p className="pt-2.5 pb-1 font-display text-[13px] font-bold tracking-[0.08em] text-rail-muted uppercase">{GROUP_LABEL[f.group]}</p>
      )}
      <Link
        href={f.href}
        className="grid grid-cols-[64px_64px_1fr_auto] items-center gap-x-3 border-t border-rail-line py-2 text-[15px] transition-colors duration-150 hover:bg-rail-2 sm:grid-cols-[80px_90px_minmax(0,1fr)_minmax(200px,1fr)_110px]"
      >
        <span className="font-display text-xl leading-none font-bold">
          {dayName(f.at)} {dayOfMonth(f.at)}
          <small className="block font-sans text-xs font-semibold tracking-[0.06em] text-rail-muted">{monthName(f.at)}</small>
        </span>
        <span className={`font-display text-[22px] font-bold tabular-nums ${urgent ? "text-live" : ""}`}>{clockTime(f.at)}</span>
        <span className="truncate">{f.event}</span>
        <span className="truncate text-rail-muted max-sm:hidden">{f.what}</span>
        <span className={`text-right font-display text-xl font-bold tabular-nums ${urgent ? "text-live" : ""}`}>{countdown(f.at, now)}</span>
      </Link>
    </li>
  );
}

/**
 * The due-soon slot: the next 7 days' deadlines as fixtures grouped by MYT day, kick-off times in MYT.
 * On phones only the next fixture shows. `items: null` means the deadlines couldn't be loaded.
 */
export function Fixtures({ items, now = new Date() }: { items: Fixture[] | null; now?: Date }) {
  return (
    <section aria-labelledby="fixtures-h" className="rail rounded-[10px] border border-rail-line bg-rail px-4 py-3 text-rail-strong sm:px-5">
      <h2 id="fixtures-h" className="font-display text-[17px] font-bold tracking-[0.06em] text-gold uppercase">
        This week&rsquo;s fixtures
      </h2>
      {!items?.length ? (
        <p className="flex items-center gap-2 py-2 text-[15px] text-rail-text">
          <Icon name={items ? "calendar-blank" : "warning-circle"} />
          {items
            ? "Nothing due this week. Registration and submission deadlines land here as you register."
            : "Deadlines couldn't be loaded. Is the HackOps API running?"}
        </p>
      ) : (
        <>
          <ol className="mt-1">{items.slice(0, SHOWN).map((f, i) => row(items, f, i, now))}</ol>
          {items.length > SHOWN && (
            <details className="group max-sm:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 border-t border-rail-line py-2 text-[13px] font-semibold text-rail-text hover:text-rail-strong [&::-webkit-details-marker]:hidden">
                {items.length - SHOWN} more this week
                <span className="transition-transform duration-150 group-open:rotate-180">
                  <Icon name="caret-down" />
                </span>
              </summary>
              <ol>{items.slice(SHOWN).map((f, i) => row(items, f, i + SHOWN, now))}</ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}
