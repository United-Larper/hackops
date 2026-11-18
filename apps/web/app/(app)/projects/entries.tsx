"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ProjectDetailDto, Stage } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { ResultSquare } from "@/components/result";
import { linkProject } from "@/lib/actions";
import { STAGE_NAME } from "@/lib/stage";

export type Candidate = { id: string; title: string; stage: Stage; hasOther: boolean };

/** The hackathons a project was entered in, plus linking it to another one. Linking replaces that hackathon's current project. */
export function Entries({ project, candidates }: { project: ProjectDetailDto; candidates: Candidate[] }) {
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const run = (hackathonId: string, projectId: string | null, ok: string) =>
    start(async () => {
      const r = await linkProject(hackathonId, projectId);
      setMsg(r.error ? { text: r.error, error: true } : { text: ok });
    });

  return (
    <section aria-labelledby="entries-h" className="flex flex-col gap-3 rounded-[10px] border border-line bg-panel px-5 py-4">
      <h2 id="entries-h" className="font-display text-xl font-bold">Entered in</h2>
      {project.hackathons.length === 0 ? (
        <p className="text-[15px] text-muted">Not linked to a hackathon yet. Link it below, or from a hackathon&apos;s Links &amp; submission tab.</p>
      ) : (
        <ol className="divide-y divide-line">
          {project.hackathons.map((h) => (
            <li key={h.id} className="flex items-center gap-3 py-2.5">
              {h.stage === "submitted" || h.stage === "results" ? <ResultSquare result={h.result} /> : <span className="size-[22px] shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1">
                <Link href={`/h/${h.id}`} className="block truncate font-semibold hover:underline">{h.title}</Link>
                <span className="block text-[13px] text-muted">{STAGE_NAME[h.stage]}</span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(h.id, null, `Unlinked from ${h.title}.`)}
                aria-label={`Unlink from ${h.title}`}
                className="min-h-9 rounded-md px-2 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-text disabled:opacity-50"
              >
                Unlink
              </button>
            </li>
          ))}
        </ol>
      )}
      {candidates.length > 0 && (
        <form
          action={(fd) => {
            const id = String(fd.get("hackathon"));
            run(id, project.id, `Linked to ${candidates.find((c) => c.id === id)?.title}.`);
          }}
          className="flex flex-col gap-2 border-t border-line pt-3"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Link to a hackathon
            <select name="hackathon" required className="min-h-10 rounded-md border border-line bg-panel px-2.5 text-[15px] font-normal">
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {STAGE_NAME[c.stage]}
                  {c.hasOther ? " · replaces its project" : ""}
                </option>
              ))}
            </select>
          </label>
          <button disabled={pending} className="min-h-10 self-start rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50">
            Link project
          </button>
        </form>
      )}
      <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted empty:hidden">
        {msg?.error && <Icon name="warning-circle" size={16} className="text-text" />}
        {msg && <span className={msg.error ? "font-medium text-text" : ""}>{msg.text}</span>}
      </p>
    </section>
  );
}
