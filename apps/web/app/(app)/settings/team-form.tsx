"use client";

import { useState, useTransition } from "react";
import type { CategoryDto, TeamDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { saveTeamProfile } from "@/lib/actions";

const field = "min-h-10 rounded-md border border-line bg-panel px-3 text-[15px] font-normal";
const label = "flex flex-col gap-1.5 text-sm font-medium";

/** The team row: what sign-up forms ask about the team, plus what the fit score reads. */
export function TeamForm({ team, categories }: { team: TeamDto | null; categories: CategoryDto[] }) {
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    const str = (k: string) => fd.get(k)?.toString().trim() || null;
    const fields = {
      name: str("name") ?? "",
      pitch: str("pitch"),
      homeCity: str("homeCity") ?? "Kuala Lumpur",
      preferredTech: (str("tech") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s, i, all) => s && all.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i),
      preferredCats: fd.getAll("cats").map(String),
    };
    start(async () => {
      const r = await saveTeamProfile(fields);
      setStatus(r.error ? { text: r.error, error: true } : { text: "Saved." });
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Team name
          <input name="name" required maxLength={120} defaultValue={team?.name} autoComplete="off" className={field} />
        </label>
        <label className={label}>
          Home city
          <input name="homeCity" required maxLength={100} defaultValue={team?.homeCity ?? "Kuala Lumpur"} className={field} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Pitch
          <textarea name="pitch" rows={3} maxLength={2000} defaultValue={team?.pitch ?? ""} className={`${field} py-2 leading-relaxed`} />
          <span className="text-xs font-normal text-muted">Two or three sentences on who the team is. Forms that ask about the team get this, and so does the public portfolio.</span>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Preferred tech
          <input name="tech" defaultValue={team?.preferredTech.join(", ")} placeholder="Next.js, Python, Supabase" className={field} />
          <span className="text-xs font-normal text-muted">Separate with commas.</span>
        </label>
      </div>

      {categories.length > 0 && (
        <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
          <legend className="float-left mb-1.5 w-full text-sm font-medium">Categories the team goes for</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((c) => (
              <label key={c.slug} className="flex min-h-10 items-center gap-2 text-[15px]">
                <input type="checkbox" name="cats" value={c.slug} defaultChecked={team?.preferredCats.includes(c.slug)} className="size-[18px] accent-[var(--text)]" />
                {c.name}
              </label>
            ))}
          </div>
          <span className="text-xs text-muted">Discover's fit score favours these and events near the home city.</span>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="min-h-10 rounded-md bg-rail px-4 text-sm font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-50">
          {pending ? "Saving" : team ? "Save team profile" : "Create team profile"}
        </button>
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
          {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
          <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
        </p>
      </div>
    </form>
  );
}
