"use client";

import { useState, useTransition } from "react";
import { ROLES, type MemberDto, type MemberInput, type Role } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { removeMember, saveMember } from "@/lib/actions";
import { ROLE_LABEL } from "@/lib/format";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const field = "min-h-10 rounded-md border border-line bg-panel px-3 text-[15px] font-normal";
const label = "flex flex-col gap-1.5 text-sm font-medium";

/** Add or edit a member. Sign-up fields (organisation, T-shirt, dietary) feed phase 09's sign-up assist. */
export function MemberForm({ member }: { member?: MemberDto }) {
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    const str = (k: string) => fd.get(k)?.toString().trim() || null;
    const fields: MemberInput = {
      name: str("name") ?? "",
      email: str("email"),
      githubUrl: str("githubUrl"),
      linkedinUrl: str("linkedinUrl"),
      skills: (str("skills") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s, i, all) => s && all.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i),
      preferredRoles: fd.getAll("roles") as Role[],
      organisation: str("organisation"),
      tshirtSize: str("tshirtSize") as MemberInput["tshirtSize"],
      dietary: str("dietary"),
    };
    start(async () => {
      const r = await saveMember(member?.id ?? null, fields);
      setStatus(r.error ? { text: r.error, error: true } : { text: "Saved." });
    });
  }

  function remove() {
    if (!member) return;
    start(async () => {
      const r = await removeMember(member.id);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>
          Name
          <input name="name" required maxLength={120} defaultValue={member?.name} autoComplete="off" className={field} />
        </label>
        <label className={label}>
          Email
          <input name="email" type="email" defaultValue={member?.email ?? ""} autoComplete="off" className={field} />
        </label>
        <label className={label}>
          Organisation
          <input name="organisation" maxLength={200} defaultValue={member?.organisation ?? ""} placeholder="University or employer" className={field} />
        </label>
        <label className={label}>
          GitHub
          <input name="githubUrl" type="url" defaultValue={member?.githubUrl ?? ""} placeholder="https://github.com/…" className={field} />
        </label>
        <label className={label}>
          LinkedIn
          <input name="linkedinUrl" type="url" defaultValue={member?.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/…" className={field} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Skills
          <input name="skills" defaultValue={member?.skills.join(", ")} placeholder="React, Python, Figma" className={field} />
          <span className="text-xs font-normal text-muted">Separate with commas. The workspace uses these to spot skill gaps.</span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Preferred roles</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {ROLES.map((r) => (
            <label key={r} className="flex min-h-10 items-center gap-2 text-[15px]">
              <input type="checkbox" name="roles" value={r} defaultChecked={member?.preferredRoles.includes(r)} className="size-[18px] accent-[var(--text)]" />
              {ROLE_LABEL[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <label className={label}>
          T-shirt size
          <select name="tshirtSize" defaultValue={member?.tshirtSize ?? ""} className={field}>
            <option value="">Not set</option>
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className={label}>
          Dietary needs
          <input name="dietary" maxLength={200} defaultValue={member?.dietary ?? ""} placeholder="Vegetarian, halal, none" className={field} />
        </label>
        <p className="text-xs text-muted sm:col-span-2">Asked on most sign-up forms; kept here so nobody types them twice.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="min-h-10 rounded-md bg-rail px-4 text-sm font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-50">
          {pending ? "Saving" : member ? "Save member" : "Add member"}
        </button>
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
          {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
          <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
        </p>
        {member && (
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
              {confirming ? `Remove ${member.name}` : "Remove member"}
            </button>
          </div>
        )}
      </div>
      {confirming && <p className="-mt-2 text-[13px] text-muted">They leave every hackathon team, and their tasks become unassigned.</p>}
    </form>
  );
}
