"use client";

import { useState, useTransition } from "react";
import type { ProjectDto, ProjectInput } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { removeProject, saveProject } from "@/lib/actions";
import { PROJECT_LINKS } from "@/lib/format";

const field = "min-h-10 rounded-md border border-line bg-panel px-3 text-[15px] font-normal";
const label = "flex flex-col gap-1.5 text-sm font-medium";

/** Add or edit a project and its five links. The links are shared by every hackathon the project is entered in. */
export function ProjectForm({ project }: { project?: ProjectDto }) {
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    const str = (k: string) => fd.get(k)?.toString().trim() || null;
    const fields: ProjectInput = {
      name: str("name") ?? "",
      description: str("description"),
      tech: (str("tech") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s, i, all) => s && all.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i),
      ...Object.fromEntries(PROJECT_LINKS.map((l) => [l.key, str(l.key)])),
    };
    start(async () => {
      const r = await saveProject(project?.id ?? null, fields);
      setStatus(r.error ? { text: r.error, error: true } : { text: "Saved." });
    });
  }

  function remove() {
    if (!project) return;
    start(async () => {
      const r = await removeProject(project.id);
      if (r.error) setStatus({ text: r.error, error: true });
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="flex flex-col gap-5 rounded-[10px] border border-line bg-panel px-5 py-5"
    >
      <label className={label}>
        Name
        <input name="name" required maxLength={120} defaultValue={project?.name} autoComplete="off" className={field} />
      </label>
      <label className={label}>
        Description
        <textarea
          name="description"
          rows={3}
          maxLength={4000}
          defaultValue={project?.description ?? ""}
          placeholder="What it does and who it's for, in a sentence or two"
          className="rounded-md border border-line bg-panel px-3 py-2 text-[15px] font-normal"
        />
        <span className="text-xs font-normal text-muted">Shown on the public portfolio.</span>
      </label>
      <label className={label}>
        Tech
        <input name="tech" defaultValue={project?.tech.join(", ")} placeholder="Next.js, Python, Firebase" className={field} />
        <span className="text-xs font-normal text-muted">Separate with commas.</span>
      </label>

      <fieldset className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <legend className="sr-only">Links</legend>
        {PROJECT_LINKS.map((l) => (
          <label key={l.key} className={label}>
            {l.label}
            <input name={l.key} type="url" defaultValue={project?.[l.key] ?? ""} placeholder={l.hint} className={field} />
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="min-h-10 rounded-md bg-rail px-4 text-sm font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-50">
          {pending ? "Saving" : project ? "Save project" : "Add project"}
        </button>
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
          {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
          <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
        </p>
        {project && (
          <div className="ml-auto flex items-center gap-2">
            {confirming && (
              <button type="button" onClick={() => setConfirming(false)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-text">
                Keep
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => (confirming ? remove() : setConfirming(true))}
              className="min-h-10 rounded-md border border-line px-3.5 text-sm font-semibold hover:border-line-strong disabled:opacity-50"
            >
              {confirming ? `Remove ${project.name}` : "Remove project"}
            </button>
          </div>
        )}
      </div>
      {confirming && <p className="-mt-2 text-[13px] text-muted">Its hackathons keep their results but lose the link to this project.</p>}
    </form>
  );
}
