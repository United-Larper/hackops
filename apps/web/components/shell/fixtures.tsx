import { Icon } from "../icon";

export type Fixture = {
  id: string;
  at: string; // ISO, UTC
  event: string;
  what: string; // "Registration closes", "Submission due", …
};

const MYT = "Asia/Kuala_Lumpur";
const day = (iso: string) => new Intl.DateTimeFormat("en-MY", { timeZone: MYT, weekday: "short" }).format(new Date(iso)).toUpperCase();
const date = (iso: string) => new Intl.DateTimeFormat("en-MY", { timeZone: MYT, day: "numeric" }).format(new Date(iso));
const month = (iso: string) => new Intl.DateTimeFormat("en-MY", { timeZone: MYT, month: "short" }).format(new Date(iso)).toUpperCase();
const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: MYT, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const sameDay = (a: Date, b: Date) => a.toLocaleDateString("en-CA", { timeZone: MYT }) === b.toLocaleDateString("en-CA", { timeZone: MYT });

function countdown(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m % 60}m`;
}

/**
 * The due-soon slot (phase 08 feeds it): this week's deadlines as fixtures, kick-off times in MYT.
 * On phones only the next fixture shows.
 */
export function Fixtures({ items, now = new Date() }: { items: Fixture[]; now?: Date }) {
  return (
    <section aria-labelledby="fixtures-h" className="rail rounded-[10px] border border-rail-line bg-rail px-4 py-3 text-rail-strong sm:px-5">
      <h2 id="fixtures-h" className="font-display text-[17px] font-bold tracking-[0.06em] text-gold uppercase">
        This week&rsquo;s fixtures
      </h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-[15px] text-rail-text">
          <Icon name="calendar-blank" />
          Nothing due this week. Registration and submission deadlines land here as you register.
        </p>
      ) : (
        <ol className="mt-1">
          {items.map((f, i) => {
            const today = sameDay(new Date(f.at), now);
            const urgent = new Date(f.at).getTime() - now.getTime() < 24 * 3_600_000; // signal red: due within 24 hours
            return (
              <li
                key={f.id}
                className={`grid grid-cols-[64px_64px_1fr_auto] items-center gap-x-3 border-t border-rail-line py-2 text-[15px] sm:grid-cols-[80px_90px_1fr_200px_110px] ${i > 0 ? "max-sm:hidden" : ""}`}
              >
                <span className="font-display text-xl leading-none font-bold">
                  {day(f.at)} {date(f.at)}
                  <small className="block font-sans text-xs font-semibold tracking-[0.06em] text-rail-muted">{today ? "TODAY" : month(f.at)}</small>
                </span>
                <span className={`font-display text-[22px] font-bold ${urgent ? "text-live" : ""}`}>{time(f.at)}</span>
                <span className="truncate">{f.event}</span>
                <span className="text-rail-muted max-sm:hidden">{f.what}</span>
                <span className={`text-right font-display text-xl font-bold ${urgent ? "text-live" : ""}`}>{countdown(new Date(f.at).getTime() - now.getTime())}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
