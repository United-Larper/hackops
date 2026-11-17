"use client";

import { useRef, useState, useTransition } from "react";
import type { MemberDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { addNote } from "@/lib/actions";

const KINDS = ["Note", "Decision", "Blocker", "Idea"] as const;
const field = "min-h-10 rounded-md border border-line bg-panel px-3 text-[15px] text-text";

/** A note for the activity feed; the kind is written as a prefix so the feed reads on its own. */
export function NoteForm({ hackathonId, members }: { hackathonId: string; members: MemberDto[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      ref={form}
      aria-label="Add a note"
      className="flex flex-col gap-3 rounded-[10px] border border-line bg-panel p-4 sm:p-5"
      action={(fd) =>
        start(async () => {
          const kind = String(fd.get("kind"));
          const body = String(fd.get("text")).trim();
          const r = await addNote(hackathonId, kind === "Note" ? body : `${kind}: ${body}`, String(fd.get("member")) || null);
          setError(r.error ?? "");
          if (!r.error) form.current?.reset();
        })
      }
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Add a note
        <textarea name="text" required rows={3} maxLength={3900} placeholder="A decision, a blocker, an idea…" className={`${field} py-2`} />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Kind
          <select name="kind" className={field}>
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          From
          <select name="member" className={field}>
            <option value="">Someone on the team</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <button disabled={pending} className="min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50">
          {pending ? "Posting" : "Post note"}
        </button>
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm font-medium">
          {error && <><Icon name="warning-circle" size={16} />{error}</>}
        </p>
      </div>
    </form>
  );
}
