"use client";

import { useState, useTransition } from "react";
import { ROLES, skillGaps, type AssignmentDto, type CategoryDto, type MemberDto, type Role } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { saveTeam } from "@/lib/actions";
import { ROLE_LABEL as ROLE } from "@/lib/format";

type Pick = { on: boolean; role: Role };

export function TeamForm({
  hackathonId, members, assignments, categories, teamSizeMax,
}: {
  hackathonId: string; members: MemberDto[]; assignments: AssignmentDto[]; categories: CategoryDto[]; teamSizeMax: number | null;
}) {
  const [picks, setPicks] = useState<Record<string, Pick>>(() =>
    Object.fromEntries(
      members.map((m) => {
        const a = assignments.find((x) => x.member.id === m.id);
        return [m.id, { on: Boolean(a), role: a?.role ?? m.preferredRoles[0] ?? "developer" }];
      }),
    ),
  );
  const [accountable, setAccountable] = useState(assignments.find((a) => a.accountable)?.member.id ?? "");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const chosen = members.filter((m) => picks[m.id].on);
  const gaps = skillGaps(categories.map((c) => c.slug), chosen.map((m) => ({ role: picks[m.id].role, skills: m.skills })));
  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const set = (id: string, p: Partial<Pick>) => setPicks((s) => ({ ...s, [id]: { ...s[id], ...p } }));

  function save() {
    const owner = chosen.some((m) => m.id === accountable) ? accountable : "";
    if (chosen.length && !owner) return setStatus({ text: "Pick the one accountable person before saving.", error: true });
    start(async () => {
      const r = await saveTeam(hackathonId, chosen.map((m) => ({ memberId: m.id, role: picks[m.id].role, accountable: m.id === owner })));
      setStatus(r.error ? { text: r.error, error: true } : { text: chosen.length ? "Team saved." : "Team cleared." });
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-3"
      >
        <fieldset className="divide-y divide-line rounded-[10px] border border-line bg-panel">
          <legend className="sr-only">Who's in, their role, and who is accountable</legend>
          {members.map((m) => {
            const p = picks[m.id];
            return (
              <div key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_150px_150px] sm:items-center sm:px-5">
                <input
                  id={`on-${m.id}`}
                  type="checkbox"
                  checked={p.on}
                  onChange={(e) => set(m.id, { on: e.target.checked })}
                  className="mt-1 size-[18px] accent-[var(--text)] sm:mt-0"
                />
                <label htmlFor={`on-${m.id}`} className="min-w-0">
                  <span className="block font-semibold">{m.name}</span>
                  <span className="block truncate text-[13px] text-muted">{m.skills.join(" · ") || "No skills listed yet"}</span>
                </label>
                <label className="col-start-2 flex items-center gap-2 text-[13px] text-muted sm:col-start-auto">
                  <span className="sm:sr-only">Role</span>
                  <select
                    value={p.role}
                    disabled={!p.on}
                    onChange={(e) => set(m.id, { role: e.target.value as Role })}
                    aria-label={`${m.name}'s role`}
                    className="min-h-10 w-full rounded-md border border-line bg-panel px-2.5 text-[15px] text-text disabled:opacity-50"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}
                  </select>
                </label>
                <label className={`col-start-2 flex min-h-10 items-center gap-2 text-sm sm:col-start-auto ${p.on ? "" : "opacity-50"}`}>
                  <input
                    type="radio"
                    name="accountable"
                    disabled={!p.on}
                    checked={accountable === m.id}
                    onChange={() => setAccountable(m.id)}
                    className="size-4 accent-[var(--text)]"
                  />
                  Accountable
                </label>
              </div>
            );
          })}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50">
            {pending ? "Saving" : "Save team"}
          </button>
          <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
            {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
            <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
          </p>
        </div>
        <p className="text-[13px] text-muted">
          Exactly one person is accountable; they become the hackathon&apos;s owner on the board.
          {teamSizeMax ? ` Teams of up to ${teamSizeMax} for this event.` : ""}
          {teamSizeMax && chosen.length > teamSizeMax ? <strong className="text-text"> {chosen.length} picked is over the limit.</strong> : null}
        </p>
      </form>

      <section aria-labelledby="gaps-h" aria-live="polite" className="rounded-[10px] border border-line bg-panel px-5 py-4">
        <h2 id="gaps-h" className="font-display text-xl font-bold">Gaps</h2>
        {chosen.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">Pick who&apos;s in to see which roles and skills the team is missing.</p>
        ) : gaps.roles.length === 0 && gaps.skills.length === 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[15px]"><Icon name="check" size={16} /> Every role and category need is covered.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-[15px]">
            {gaps.roles.length > 0 && <li>No {gaps.roles.map((r) => ROLE[r].toLowerCase()).join(", ")} yet.</li>}
            {gaps.skills.map((g) => (
              <li key={g.category}>
                <span className="font-medium">{g.need}</span> <span className="text-muted">for {catName(g.category)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">A rough guide from the event&apos;s categories and the skills on each member&apos;s profile.</p>
      </section>
    </div>
  );
}
