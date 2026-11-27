"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icon";
import { refreshDiscovery, type RefreshState } from "./actions";

export function RefreshButton() {
  const [state, action, pending] = useActionState<RefreshState, FormData>(refreshDiscovery, null);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <p role="status" aria-live="polite" className={`text-sm ${state?.failed ? "text-live-text" : "text-muted"}`}>
        {pending ? "Checking Devpost, MLH and the Malaysian list…" : state?.message}
      </p>
      <button
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-rail px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-60"
      >
        <Icon name="arrow-clockwise" size={16} className={pending ? "animate-spin" : ""} />
        {pending ? "Refreshing" : "Refresh now"}
      </button>
    </form>
  );
}

const CHOICES = [
  { stage: "interested", word: "Interested", hint: "Move it to the board" },
  { stage: "skipped", word: "Skip", hint: "Hide it from Discover" },
] as const;

/** One "Decide" button per row that opens Interested / Skip. Closes on Escape or a click outside. */
export function DecideMenu({ id, action }: { id: string; action: (fd: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`decide-${id}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line-strong bg-panel px-3.5 text-sm font-semibold transition-colors hover:bg-panel-2"
      >
        Decide
        <Icon name="caret-down" size={14} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <form id={`decide-${id}`} action={action} className="absolute left-0 z-10 mt-1 flex w-56 flex-col rounded-md border border-line-strong bg-panel p-1 lg:right-0 lg:left-auto">
          <input type="hidden" name="id" value={id} />
          {CHOICES.map((c) => (
            <Choice key={c.stage} {...c} />
          ))}
        </form>
      )}
    </div>
  );
}

/** A menu choice: submits its stage with the form, disabled while the move is saving. */
function Choice({ stage, word, hint }: (typeof CHOICES)[number]) {
  const { pending } = useFormStatus();
  return (
    <button name="stage" value={stage} disabled={pending} className="flex min-h-11 flex-col items-start justify-center rounded-[4px] px-3 py-1.5 text-left transition-colors hover:bg-panel-2 disabled:opacity-50">
      <span className="text-sm font-semibold">{word}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}
