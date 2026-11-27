import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import type { WinnersDto } from "@hackops/shared";
import { api, ApiError } from "@/lib/api";

function Panel({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <section aria-labelledby="wins-h" aria-busy={busy || undefined} className="rounded-[10px] border border-line bg-panel px-5 py-4">
      <h2 id="wins-h" className="font-display text-xl font-bold">What wins here</h2>
      {children}
    </section>
  );
}

export function WinnersLoading() {
  return (
    <Panel busy>
      <p className="mt-2 text-[15px] text-muted">Reading past winners on Devpost. The first look at an organizer takes up to a minute; after that it&apos;s kept for a week.</p>
    </Panel>
  );
}

/** Past Devpost winners by the same organizer, or "No past data" rather than a guess. */
export async function Winners({ id }: { id: string }) {
  let w: WinnersDto;
  try {
    w = await api<WinnersDto>(`/hackathons/${encodeURIComponent(id)}/winners`);
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
    return (
      <Panel>
        <p className="mt-2 text-[15px] text-muted">{e instanceof ApiError ? e.message : "Couldn't load past winners."} Reload the page to try again.</p>
      </Panel>
    );
  }
  const b = w.brief;
  if (!b || !b.winners) {
    return (
      <Panel>
        <p className="mt-2 text-[15px]">No past data</p>
        <p className="mt-1 text-[13px] text-muted">
          This comes from earlier Devpost editions by the same organizer, and {w.organizer ? `${w.organizer} has none with winners` : "this event isn't one"}.
        </p>
      </Panel>
    );
  }
  const rows: [string, ReactNode][] = [
    [
      "Mostly built with",
      b.topTech.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {b.topTech.map((t) => <li key={t} className="rounded-[3px] bg-panel-2 px-2 py-0.5 text-xs font-medium">{t}</li>)}
        </ul>
      ) : (
        <span className="text-muted">Not listed</span>
      ),
    ],
    ["Average team", b.avgTeam ? <><Big>{b.avgTeam}</Big> {b.avgTeam === 1 ? "person" : "people"}</> : <span className="text-muted">Not listed</span>],
    ["Demo video", <><Big>{b.withVideo}</Big> of <Big>{b.winners}</Big> winners</>],
  ];
  return (
    <Panel>
      <dl className="mt-2 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline gap-3 py-2">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="text-[15px]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 border-t border-line pt-3 text-[13px] text-muted">
        From <Big small>{b.winners}</Big> winners across <Big small>{b.editions}</Big> past {b.editions === 1 ? "edition" : "editions"} by {w.organizer} on Devpost.
      </p>
    </Panel>
  );
}

const Big = ({ children, small }: { children: number; small?: boolean }) => (
  <span className={`font-display font-bold text-text tabular-nums ${small ? "text-base" : "text-xl"}`}>{children}</span>
);
