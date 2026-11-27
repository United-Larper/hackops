"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { BOARD_STAGES, type BoardCardDto, type BoardDto, type HackathonResult, type Stage } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { MatchClock } from "@/components/match-clock";
import { AskDialog, Menu } from "@/components/stage";
import { RESULT_META as RESULT, STAGE_NAME as NAME, askFor, type AskKind, type MoveOpts } from "@/lib/stage";
import { clockTime, countdown, isUrgent, shortDate } from "@/lib/time";
import { moveCard } from "@/lib/actions";

type Column = (typeof BOARD_STAGES)[number] | "skipped";
type Move = { id: string; to: Column; result?: HackathonResult };
type Ask = { card: BoardCardDto; kind: AskKind };

const HINT: Record<Column, string> = {
  interested: "Picked from Discover. Decide: register or skip.",
  registered: "Team and roles set; the task list starts here.",
  building: "The match clock runs to submission.",
  submitted: "Waiting for judging.",
  results: "Won, finalist or participated, plus a retro.",
  skipped: "Skipped hackathons. Drag one back to reconsider it.",
};
const DUE: Record<string, string> = { registration: "Registration closes", submission: "Submission due", judging: "Judging" };
// Cards carry their own drag type, so drop zones can tell them apart from text or files without waiting for a re-render.
const CARD = "application/x-hackops-card";

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function apply(board: BoardDto, m: Move): BoardDto {
  const next = Object.fromEntries(Object.entries(board).map(([k, v]) => [k, v.filter((c) => c.id !== m.id)])) as BoardDto;
  const card = Object.values(board).flat().find((c) => c.id === m.id);
  if (card && next[m.to as keyof BoardDto]) next[m.to as keyof BoardDto]!.unshift({ ...card, stage: m.to, result: m.result ?? null });
  return next;
}

export function Board({ board }: { board: BoardDto }) {
  const [shown, addMove] = useOptimistic(board, apply);
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Column | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const columns = Object.keys(shown) as Column[];

  function commit(card: BoardCardDto, to: Column, opts: MoveOpts = {}) {
    setStatus(null);
    startTransition(async () => {
      addMove({ id: card.id, to, result: opts.result });
      const r = await moveCard(card.id, to as Stage, opts);
      // A refused move needs no undo: the optimistic state falls back to the server's board when the transition ends.
      setStatus(r.error ? { text: `Couldn't move ${card.title} to ${NAME[to]}: ${r.error}`, error: true } : { text: `${card.title} moved to ${NAME[to]}.` });
    });
  }

  /** Every move, dragged or picked from the menu, passes through here. */
  function request(card: BoardCardDto, to: Column) {
    if (card.stage === to) return;
    const kind = askFor(card.stage, to);
    if (kind) return setAsk({ card, kind });
    commit(card, to);
  }

  const find = (id: string) => Object.values(shown).flat().find((c) => c.id === id);
  const drop = (to: Column) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const card = find(e.dataTransfer.getData(CARD));
    if (card) request(card, to);
  };

  return (
    <>
      <p role="status" aria-live="polite" className="flex min-h-6 items-center gap-1.5 text-sm text-muted">
        {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
        <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
      </p>
      <div className="-mx-4 overflow-x-auto px-4 pb-3 max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 sm:mx-0 sm:px-0">
        <ol
          className="grid gap-3.5 [--col:minmax(184px,1fr)] max-sm:[--col:78vw]"
          style={{ gridTemplateColumns: `repeat(${columns.length}, var(--col))` }}
          aria-label="Stages"
        >
          {columns.map((col) => {
            const cards = shown[col as keyof BoardDto] ?? [];
            return (
              <li
                key={col}
                className="flex min-h-[340px] snap-start flex-col"
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(CARD)) return;
                  e.preventDefault();
                  if (over !== col) setOver(col);
                }}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
                onDrop={drop(col)}
              >
                <h2 className="mb-2.5 flex justify-between border-b-2 border-line-strong px-0.5 pb-2.5 font-display text-[17px] font-bold tracking-[0.05em] uppercase">
                  {NAME[col]}
                  <span className="text-muted tabular-nums">{cards.length}</span>
                </h2>
                <ul
                  aria-label={`${NAME[col]}, ${cards.length} hackathon${cards.length === 1 ? "" : "s"}`}
                  className={`flex flex-1 flex-col gap-2.5 rounded-lg transition-colors duration-150 ${
                    over === col ? "bg-panel-2 outline-2 outline-offset-4 outline-line-strong" : ""
                  }`}
                >
                  {cards.map((c) => (
                    <Card
                      key={c.id}
                      card={c}
                      columns={columns}
                      dragging={dragId === c.id}
                      onDrag={(id) => {
                        setDragId(id);
                        if (!id) setOver(null);
                      }}
                      onMove={(to) => request(c, to)}
                      onDecide={() => setAsk({ card: c, kind: "decide" })}
                    />
                  ))}
                  {cards.length === 0 && (
                    <li className="flex-1 rounded-lg border border-dashed border-line p-3 text-sm leading-snug text-muted">{HINT[col]}</li>
                  )}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
      {ask && (
        <AskDialog
          kind={ask.kind}
          title={ask.card.title}
          decisionNote={ask.card.decisionNote}
          onClose={() => setAsk(null)}
          onConfirm={(to, opts) => {
            setAsk(null);
            commit(ask.card, to as Column, opts);
          }}
        />
      )}
    </>
  );
}

function Card({
  card: c, columns, dragging, onDrag, onMove, onDecide,
}: {
  card: BoardCardDto; columns: Column[]; dragging: boolean;
  onDrag: (id: string | null) => void; onMove: (to: Column) => void; onDecide: () => void;
}) {
  const due = c.nextDeadline;
  const live = c.stage === "building" && due?.kind === "submission";
  const pct = c.progress.total ? Math.round((c.progress.done / c.progress.total) * 100) : 0;

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(CARD, c.id);
        e.dataTransfer.effectAllowed = "move";
        onDrag(c.id);
      }}
      onDragEnd={() => onDrag(null)}
      className={`group relative flex cursor-grab flex-col gap-2.5 rounded-lg border border-line bg-panel p-3 transition-[border-color,opacity] duration-150 hover:border-line-strong active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Link href={`/h/${c.id}`} draggable={false} className="min-w-0 flex-1 text-[15px] leading-tight font-semibold text-balance after:absolute after:inset-0 after:rounded-lg hover:underline">
          {c.title}
        </Link>
        {c.result && (
          <span className={`grid size-[22px] shrink-0 place-items-center rounded-[3px] font-display text-sm font-bold ${RESULT[c.result].cls}`} role="img" aria-label={RESULT[c.result].word}>
            {RESULT[c.result].letter}
          </span>
        )}
      </div>

      {live ? (
        <MatchClock to={due.at} tone="light" />
      ) : due ? (
        <p className="leading-none">
          <span className={`font-display text-xl font-bold tabular-nums ${isUrgent(due.at) ? "text-live-text" : ""}`} suppressHydrationWarning>
            {countdown(due.at)}
          </span>{" "}
          <span className="mt-1 block text-[13px] leading-snug text-muted">
            {DUE[due.kind]} · {shortDate(due.at)}, {clockTime(due.at)}
          </span>
        </p>
      ) : (
        c.stage !== "results" && c.stage !== "skipped" && <p className="text-[13px] text-muted">No upcoming deadline listed</p>
      )}

      {c.categories.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Categories">
          {c.categories.slice(0, 3).map((cat) => (
            <li key={cat.slug} className="rounded-[3px] bg-panel-2 px-2 py-0.5 text-xs font-medium">
              {cat.name}
            </li>
          ))}
          {c.categories.length > 3 && <li className="px-1 py-0.5 text-xs text-muted">+{c.categories.length - 3}</li>}
        </ul>
      )}

      {c.progress.total > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-panel-2" aria-hidden>
            <div className="h-full bg-text" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-display text-sm font-bold tabular-nums">
            {c.progress.done}/{c.progress.total}
            <span className="sr-only"> tasks done</span>
          </span>
        </div>
      )}

      {/* Controls sit above the card-wide link (relative z-10) so they stay clickable. */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5">
        {c.owner && (
          <span className="grid size-7 place-items-center rounded-full bg-rail font-display text-xs font-bold text-rail-strong" title={c.owner.name}>
            <span aria-hidden>{initials(c.owner.name)}</span>
            <span className="sr-only">Owner: {c.owner.name}</span>
          </span>
        )}
        {c.stage === "interested" && (
          <button onClick={onDecide} className="ml-auto min-h-9 rounded-md border border-line-strong bg-panel px-2.5 text-sm font-semibold transition-colors hover:bg-text hover:text-ground">
            Decide
          </button>
        )}
        <Menu
          id={c.id}
          label={<>Move <Icon name="caret-down" size={14} /></>}
          ariaLabel={`Move ${c.title}`}
          heading="Move to"
          buttonClass={`text-muted hover:bg-panel-2 hover:text-text ${c.stage === "interested" ? "" : "ml-auto"}`}
          items={columns.filter((col) => col !== c.stage).map((col) => ({ key: col, label: NAME[col], onSelect: () => onMove(col) }))}
        />
      </div>
    </li>
  );
}
