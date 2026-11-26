import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { phaseOf } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { RESULT_META, STAGE_NAME } from "@/lib/stage";
import { money } from "@/lib/format";
import { clockTime, shortDate } from "@/lib/time";
import { getWorkspace } from "@/lib/workspace";
import { PrizeTracks } from "./tracks";
import { Winners, WinnersLoading } from "./winners";

const MODE: Record<string, string> = { online: "Online", in_person: "In person", hybrid: "Hybrid" };
const PHASE: Record<string, string> = { initiation: "Initiation", planning: "Planning", execution: "Execution and monitoring", closing: "Closing" };
const when = (d: string | null) => (d ? `${shortDate(d)}, ${clockTime(d)} MYT` : null);

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await getWorkspace(id);
  const phase = phaseOf(h.stage);
  const place = h.mode === "online" ? null : [h.city, h.country].filter(Boolean).join(", ") || "Place not listed";

  const rows: [string, ReactNode][] = [
    ["Stage", <>{STAGE_NAME[h.stage]}{phase && <span className="text-muted"> · {PHASE[phase]}</span>}</>],
    ...(h.result ? [["Result", <ResultBadge key="r" result={h.result} />] as [string, ReactNode]] : []),
    ["Format", <>{MODE[h.mode] ?? h.mode}{place && <span className="text-muted"> · {place}</span>}</>],
    ["Event dates", h.startsAt ? <>{when(h.startsAt)}{h.endsAt && <> to {when(h.endsAt)}</>}</> : <span className="text-muted">Not listed</span>],
    ["Registration closes", when(h.registrationClosesAt) ?? <span className="text-muted">Not listed</span>],
    ["Submission due", when(h.submissionDueAt) ?? <span className="text-muted">Not listed</span>],
    ["Prize", h.prizeAmount ? <span className="font-display text-xl font-bold">{money(h.prizeAmount, h.prizeCurrency)}</span> : <span className="text-muted">Not listed</span>],
    ["Team size", h.teamSizeMax ? `Up to ${h.teamSizeMax}` : <span className="text-muted">Not listed</span>],
    [
      "Categories",
      h.categories.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {h.categories.map((c) => (
            <li key={c.slug} className="rounded-[3px] bg-panel-2 px-2 py-0.5 text-xs font-medium">{c.name}</li>
          ))}
        </ul>
      ) : (
        <span className="text-muted">None yet</span>
      ),
    ],
    [
      "Project",
      h.project ? (
        <Link href={`/h/${h.id}/links`} className="font-medium underline">{h.project.name}</Link>
      ) : (
        <Link href={`/h/${h.id}/links`} className="text-muted underline hover:text-text">Link or create one</Link>
      ),
    ],
    [
      "Event page",
      <a key="u" href={h.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-medium underline">
        <span className="truncate">{h.organizer ?? new URL(h.url).hostname}</span>
        <Icon name="arrow-right" size={13} className="-rotate-45" label="Opens the event page" />
      </a>,
    ],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <dl className="divide-y divide-line rounded-[10px] border border-line bg-panel">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="text-[15px]">{value}</dd>
            </div>
          ))}
        </dl>
        <PrizeTracks hackathonId={h.id} tracks={h.prizeTracks} hasProject={Boolean(h.project)} canImport={h.source === "devpost"} />
      </div>

      <div className="flex flex-col gap-5">
        <section aria-labelledby="decision-h" className="rounded-[10px] border border-line bg-panel px-5 py-4">
          <h2 id="decision-h" className="font-display text-xl font-bold">Decision note</h2>
          {h.decisionNote ? (
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{h.decisionNote}</p>
          ) : (
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Why the team is entering. It&apos;s written when someone decides from the board, or added from the stage control.
            </p>
          )}
          {h.fit && h.fit.reasons.length > 0 && (
            <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
              Fit <span className="font-display text-base font-bold text-text">{h.fit.score}</span> · {h.fit.reasons.join(" · ")}
            </p>
          )}
        </section>
        <Suspense fallback={<WinnersLoading />}>
          <Winners id={h.id} />
        </Suspense>
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: keyof typeof RESULT_META }) {
  const r = RESULT_META[result];
  return (
    <span className="inline-flex items-center gap-2 font-medium">
      <span className={`grid size-[22px] place-items-center rounded-[3px] font-display text-sm font-bold ${r.cls}`} aria-hidden>{r.letter}</span>
      {r.word}
    </span>
  );
}
