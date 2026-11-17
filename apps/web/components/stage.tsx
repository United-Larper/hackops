"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RESULTS, type Stage } from "@hackops/shared";
import { RESULT_META, type AskKind, type MoveOpts } from "@/lib/stage";

/** A small menu: a native popover anchored under its button (see .menu-button / .menu-pop in globals.css). */
export function Menu({
  id, label, ariaLabel, heading, items, buttonClass = "",
}: {
  id: string; label: ReactNode; ariaLabel: string; heading: string;
  items: { key: string; label: string; onSelect: () => void }[]; buttonClass?: string;
}) {
  const pop = useRef<HTMLDivElement>(null);
  const anchor = { "--anchor": `--menu-${id.replace(/[^\w-]/g, "")}` } as CSSProperties;
  return (
    <>
      <button
        popoverTarget={`menu-${id}`}
        style={anchor}
        aria-label={ariaLabel}
        className={`menu-button inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold transition-colors ${buttonClass}`}
      >
        {label}
      </button>
      <div ref={pop} id={`menu-${id}`} popover="auto" style={anchor} className="menu-pop min-w-40 rounded-md border border-line-strong bg-panel p-1 text-text">
        <p className="px-2.5 pt-1.5 pb-1 text-xs text-muted">{heading}</p>
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => {
              pop.current?.hidePopover();
              it.onSelect();
            }}
            className="flex min-h-9 w-full items-center rounded-md px-2.5 text-left text-sm font-medium hover:bg-panel-2"
          >
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** Modal question asked before a stage change: register or skip with a note, or pick the result. */
export function AskDialog({
  kind, title, decisionNote, onClose, onConfirm,
}: {
  kind: AskKind; title: string; decisionNote: string | null; onClose: () => void; onConfirm: (to: Stage, opts: MoveOpts) => void;
}) {
  const [note, setNote] = useState(decisionNote ?? "");
  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      aria-labelledby="ask-h"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[10px] border border-line bg-panel p-5 text-text backdrop:bg-rail/60"
    >
      <h2 id="ask-h" className="font-display text-2xl leading-tight font-bold">
        {kind === "decide" ? `Enter ${title}?` : `How did ${title} go?`}
      </h2>
      {kind === "decide" ? (
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm((e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") as Stage, { note });
          }}
          className="mt-4 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Decision note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Why it's worth entering, or why not"
              className="rounded-md border border-line bg-panel px-3 py-2 text-[15px] font-normal"
            />
            <span className="text-xs font-normal text-muted">Optional. Kept on the workspace overview.</span>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-10 rounded-md px-3.5 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-text">
              Cancel
            </button>
            <button value="skipped" className="min-h-10 rounded-md border border-line bg-panel px-3.5 text-sm font-semibold hover:border-line-strong">
              Skip it
            </button>
            <button value="registered" className="min-h-10 rounded-md bg-rail px-4 text-sm font-semibold text-gold hover:bg-rail-2">
              Register
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-[15px] text-muted">Pick the result to move it to Results. It goes into the form guide.</p>
          <div className="grid grid-cols-3 gap-2">
            {RESULTS.map((r) => (
              <button
                key={r}
                onClick={() => onConfirm("results", { result: r })}
                className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-md border border-line bg-panel text-sm font-semibold hover:border-line-strong"
              >
                <span className={`grid size-[26px] place-items-center rounded-[3px] font-display text-base font-bold ${RESULT_META[r].cls}`} aria-hidden>
                  {RESULT_META[r].letter}
                </span>
                {RESULT_META[r].word}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="min-h-10 self-end rounded-md px-3.5 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-text">
            Cancel
          </button>
        </div>
      )}
    </dialog>
  );
}
