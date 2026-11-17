"use client";

import { useState, useTransition } from "react";
import type { ProjectDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { createProject, linkProject, saveProjectLinks, type ProjectLinks } from "@/lib/actions";

const LINKS: { key: keyof ProjectLinks; label: string; hint: string }[] = [
  { key: "repoUrl", label: "Repository", hint: "https://github.com/…" },
  { key: "demoUrl", label: "Live demo", hint: "https://…" },
  { key: "videoUrl", label: "Demo video", hint: "https://youtu.be/…" },
  { key: "slidesUrl", label: "Slides", hint: "https://…" },
  { key: "devpostUrl", label: "Submission page", hint: "https://devpost.com/software/…" },
];
const field = "min-h-10 w-full rounded-md border border-line bg-panel px-3 text-[15px] text-text";
const btn = "min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50";

function useSave() {
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ? { text: r.error, error: true } : { text: ok });
    });
  const status = (
    <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
      {msg?.error && <Icon name="warning-circle" size={16} className="text-text" />}
      <span className={msg?.error ? "font-medium text-text" : ""}>{msg?.text}</span>
    </p>
  );
  return { run, pending, status };
}

/** Edit the linked project's links. The project is shared with any other hackathon it's linked to. */
export function LinksForm({ hackathonId, project, sharedWith }: { hackathonId: string; project: ProjectDto; sharedWith: number }) {
  const { run, pending, status } = useSave();
  return (
    <form
      className="flex flex-col gap-3"
      action={(fd) => {
        const links = Object.fromEntries(LINKS.map((l) => [l.key, String(fd.get(l.key)).trim() || null])) as ProjectLinks;
        run(() => saveProjectLinks(project.id, links), "Links saved.");
      }}
    >
      <div className="divide-y divide-line rounded-[10px] border border-line bg-panel">
        {LINKS.map((l) => {
          const url = project[l.key];
          return (
            <label key={l.key} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5">
              <span className="text-[13px] text-muted">{l.label}</span>
              <input name={l.key} type="url" defaultValue={url ?? ""} placeholder={l.hint} className={field} />
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium underline">
                  Open <Icon name="arrow-right" size={13} className="-rotate-45" />
                </a>
              ) : (
                <span className="text-sm text-muted">Missing</span>
              )}
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving" : "Save links"}</button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => linkProject(hackathonId, null), "Project unlinked.")}
          className="min-h-10 px-2 text-sm font-semibold text-muted underline hover:text-text"
        >
          Unlink project
        </button>
        {status}
      </div>
      {sharedWith > 0 && (
        <p className="text-[13px] text-muted">
          {project.name} is also linked to {sharedWith} other hackathon{sharedWith === 1 ? "" : "s"}; link changes show there too.
        </p>
      )}
    </form>
  );
}

/** No project yet: link one the team already has, or create one here. */
export function PickProject({ hackathonId, projects, suggested }: { hackathonId: string; projects: ProjectDto[]; suggested: string }) {
  const { run, pending, status } = useSave();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.length > 0 && (
        <form
          action={(fd) => run(() => linkProject(hackathonId, String(fd.get("project"))), "Project linked.")}
          className="flex flex-col gap-3 rounded-[10px] border border-line bg-panel p-4 sm:p-5"
        >
          <h2 className="font-display text-xl font-bold">Link an existing project</h2>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Project
            <select name="project" required className={field}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <button disabled={pending} className={`${btn} self-start`}>Link project</button>
        </form>
      )}
      <form
        action={(fd) => run(() => createProject(hackathonId, String(fd.get("name")).trim(), String(fd.get("repo")).trim() || null), "Project created and linked.")}
        className="flex flex-col gap-3 rounded-[10px] border border-line bg-panel p-4 sm:p-5"
      >
        <h2 className="font-display text-xl font-bold">Start a new project</h2>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input name="name" required maxLength={200} defaultValue={suggested} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Repository <span className="font-normal text-muted">(optional)</span>
          <input name="repo" type="url" placeholder="https://github.com/…" className={field} />
        </label>
        <button disabled={pending} className={`${btn} self-start`}>Create and link</button>
      </form>
      <div className="md:col-span-2">{status}</div>
    </div>
  );
}
