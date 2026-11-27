import { clockTime, shortDate } from "@/lib/time";
import { getWorkspace, initials } from "@/lib/workspace";
import { NoteForm } from "./note-form";

export default async function ActivityTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await getWorkspace(id);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
      <div className="lg:col-start-2 lg:row-start-1">
        <NoteForm hackathonId={h.id} />
      </div>
      <section aria-labelledby="feed-h" className="lg:col-start-1 lg:row-start-1">
        <h2 id="feed-h" className="sr-only">Activity, newest first</h2>
        {h.activity.length === 0 ? (
          <p className="text-[15px] text-muted">Nothing yet. Changes and notes show up here as the team works.</p>
        ) : (
          <ol className="flex flex-col">
            {h.activity.map((a) =>
              a.kind === "note" ? (
                <li key={a.id} className="my-1.5 flex gap-3 rounded-[10px] border border-line bg-panel px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rail font-display text-xs font-bold text-rail-strong" aria-hidden>
                    {a.member ? initials(a.member.name) : "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] text-muted">
                      <span className="font-semibold text-text">{a.member?.name ?? "Someone on the team"}</span> · {shortDate(a.createdAt)}, {clockTime(a.createdAt)}
                    </p>
                    <p className="mt-0.5 text-[15px] leading-relaxed whitespace-pre-line">{a.text}</p>
                  </div>
                </li>
              ) : (
                <li key={a.id} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-line px-1 py-2 text-sm last:border-b-0">
                  <span className="font-display font-bold text-muted tabular-nums">
                    {shortDate(a.createdAt).split(" ").slice(1).join(" ")} {clockTime(a.createdAt)}
                  </span>
                  <span>
                    {a.text}
                    {a.member && <span className="text-muted"> · {a.member.name}</span>}
                  </span>
                </li>
              ),
            )}
          </ol>
        )}
        {h.activity.length === 50 && <p className="mt-3 text-[13px] text-muted">Showing the latest 50.</p>}
      </section>
    </div>
  );
}
