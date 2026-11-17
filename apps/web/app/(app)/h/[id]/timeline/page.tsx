import { EmptyState } from "@/components/shell/page-header";
import { Icon } from "@/components/icon";
import { clockTime, isUrgent, sameDay, shortDate } from "@/lib/time";
import { getWorkspace } from "@/lib/workspace";

type Item = { at: string; label: string; detail?: string; kind: "event" | "task"; done?: boolean };

const EVENT: [key: "registrationClosesAt" | "startsAt" | "endsAt" | "submissionDueAt" | "judgingAt", label: string][] = [
  ["registrationClosesAt", "Registration closes"],
  ["startsAt", "Event starts"],
  ["endsAt", "Event ends"],
  ["submissionDueAt", "Submission due"],
  ["judgingAt", "Judging"],
];

export default async function TimelineTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await getWorkspace(id);
  const items: Item[] = [
    ...EVENT.flatMap(([key, label]) => (h[key] ? [{ at: h[key], label, kind: "event" as const }] : [])),
    ...h.tasks.flatMap((t) =>
      t.dueAt ? [{ at: t.dueAt, label: t.title, detail: t.assignee?.name ?? "Unassigned", kind: "task" as const, done: t.status === "done" }] : [],
    ),
  ].sort((a, b) => a.at.localeCompare(b.at));

  if (!items.length) {
    return <EmptyState title="No dates yet">Event dates come from the listing; task due dates appear here once tasks have them.</EmptyState>;
  }

  const now = new Date();
  const nowAt = items.findIndex((i) => new Date(i.at) > now);
  const marker = nowAt === -1 ? items.length : nowAt;

  return (
    <ol aria-label="Timeline, Malaysia time" className="relative ml-[7px] border-l-2 border-line pb-2">
      {items.map((it, i) => (
        <Row key={`${it.kind}-${it.at}-${i}`} it={it} now={now} past={i < marker} showDay={i === 0 || !sameDay(new Date(items[i - 1].at), new Date(it.at))}>
          {i === marker && <NowRow now={now} />}
        </Row>
      ))}
      {marker === items.length && <NowRow now={now} />}
    </ol>
  );
}

function NowRow({ now }: { now: Date }) {
  return (
    <li className="relative -ml-px flex items-center gap-3 py-3 pl-5" aria-current="time">
      <span className="absolute top-1/2 -left-[9px] size-4 -translate-y-1/2 rounded-full border-2 border-ground bg-text" aria-hidden />
      <span className="h-0.5 w-6 bg-text" aria-hidden />
      <span className="font-display text-[17px] font-bold tracking-[0.05em] uppercase">Now</span>
      <span suppressHydrationWarning className="font-display text-sm font-bold text-muted tabular-nums">
        {shortDate(now)}, {clockTime(now)}
      </span>
    </li>
  );
}

function Row({ it, now, past, showDay, children }: { it: Item; now: Date; past: boolean; showDay: boolean; children?: React.ReactNode }) {
  const urgent = !past && !it.done && isUrgent(it.at, now);
  return (
    <>
      {children}
      <li className={`relative grid grid-cols-[92px_minmax(0,1fr)] gap-x-4 py-2.5 pl-5 sm:grid-cols-[120px_minmax(0,1fr)] ${past ? "text-muted" : ""}`}>
        <span
          className={`absolute top-[17px] -left-[6px] size-2.5 rounded-full ${it.kind === "event" ? "bg-text" : "border-2 border-line-strong bg-ground"} ${past ? "opacity-50" : ""}`}
          aria-hidden
        />
        <span className="font-display leading-tight tabular-nums">
          <span className={`block text-[15px] font-bold ${showDay ? "" : "sr-only"}`}>{shortDate(it.at)}</span>
          <span className={`text-sm font-bold ${urgent ? "text-live-text" : ""}`}>{clockTime(it.at)}</span>
        </span>
        <span className="min-w-0">
          <span className={`flex items-center gap-1.5 ${it.kind === "event" ? "font-semibold" : ""} ${it.done ? "line-through decoration-1" : ""}`}>
            {it.done && <Icon name="check" size={14} label="Done" />}
            {it.label}
          </span>
          <span className="block text-[13px] text-muted">{it.kind === "event" ? "Event date" : `Task · ${it.detail}`}</span>
        </span>
      </li>
    </>
  );
}
