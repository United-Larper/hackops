"use client";

import { useState, useTransition } from "react";
import { ROLES, skillGaps, type AssignmentDto, type CategoryDto, type MemberDto, type Role } from "@hackops/shared";
import { Accountable } from "@/components/accountable";
import { Icon } from "@/components/icon";
import { saveTeam } from "@/lib/actions";
import { ROLE_LABEL as ROLE } from "@/lib/format";

type Pick = { on: boolean; role: Role };

export function TeamForm({
  hackathonId, meId, members, assignments, categories, teamSizeMax, clashes,
}: {
  hackathonId: string; meId: string; members: MemberDto[]; assignments: AssignmentDto[]; categories: CategoryDto[]; teamSizeMax: number | null;
  /** Per member: titles of their other active hackathons on overlapping dates. */
  clashes: Record<string, string[]>;
}) {
  // A new lineup starts with the signed-in member ticked: whoever saves it is accountable.
  const fromSaved = () =>
    Object.fromEntries(
      members.map((m) => {
        const a = assignments.find((x) => x.member.id === m.id);
        return [m.id, { on: a ? true : !assignments.length && m.id === meId, role: a?.role ?? m.preferredRoles[0] ?? "developer" }];
      }),
    ) as Record<string, Pick>;
  const [picks, setPicks] = useState(fromSaved);
  // A saved lineup stays locked until someone presses Edit team.
  const [editing, setEditing] = useState(assignments.length === 0);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const chosen = members.filter((m) => picks[m.id].on);
  const lineup = editing
    ? chosen.map((m) => ({ role: picks[m.id].role, skills: m.skills }))
    : assignments.map((a) => ({ role: a.role, skills: members.find((m) => m.id === a.member.id)?.skills ?? [] }));
  const gaps = skillGaps(categories.map((c) => c.slug), lineup);
  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const set = (id: string, p: Partial<Pick>) => setPicks((s) => ({ ...s, [id]: { ...s[id], ...p } }));

  function save() {
    if (chosen.length && !picks[meId]?.on) return setStatus({ text: "Add yourself: whoever saves the team is accountable for it.", error: true });
    start(async () => {
      const r = await saveTeam(hackathonId, chosen.map((m) => ({ memberId: m.id, role: picks[m.id].role })));
      if (r.error) return setStatus({ text: r.error, error: true });
      setStatus({ text: chosen.length ? "Team saved." : "Team cleared." });
      if (chosen.length) setEditing(false);
    });
  }

  function edit() {
    setPicks(fromSaved());
    setStatus(null);
    setEditing(true);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
      {!editing ? (
        <div className="flex flex-col gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-panel" aria-label="The team">
            {assignments.map((a) => (
              <li key={a.member.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
                <span className="min-w-0 flex-1 font-semibold">{a.member.name}</span>
                <span className="text-[13px] text-muted">{ROLE[a.role]}</span>
                {a.accountable && <Accountable />}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={edit} className="min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground">
              Edit team
            </button>
            <p role="status" aria-live="polite" className="text-sm text-muted">{status?.text}</p>
          </div>
          <p className="text-[13px] text-muted">
            Whoever saves the team is accountable and becomes the hackathon&apos;s owner on the board.
            {teamSizeMax ? ` Teams of up to ${teamSizeMax} for this event.` : ""}
          </p>
        </div>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-3"
      >
        <fieldset className="divide-y divide-line rounded-[10px] border border-line bg-panel">
          <legend className="sr-only">Who's in and their role</legend>
          {members.map((m) => {
            const p = picks[m.id];
            return (
              <div key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_150px] sm:items-center sm:px-5">
                <input
                  id={`on-${m.id}`}
                  type="checkbox"
                  checked={p.on}
                  onChange={(e) => set(m.id, { on: e.target.checked })}
                  className="mt-1 size-[18px] accent-[var(--text)] sm:mt-0"
                />
                <label htmlFor={`on-${m.id}`} className="min-w-0">
                  <span className="block font-semibold">
                    {m.name}
                    {m.id === meId && <span className="font-normal text-muted"> (you)</span>}
                  </span>
                  <span className="block truncate text-[13px] text-muted">{m.skills.join(" · ") || "No skills listed yet"}</span>
                  {p.on && clashes[m.id]?.length ? (
                    <span className="mt-1 flex items-start gap-1.5 text-[13px] font-medium">
                      <Icon name="warning-circle" size={16} className="mt-px shrink-0" />
                      Also on {clashes[m.id].join(", ")} on overlapping dates
                    </span>
                  ) : null}
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
              </div>
            );
          })}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50">
            {pending ? "Saving" : "Save team"}
          </button>
          {assignments.length > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setStatus(null);
              }}
              className="min-h-10 rounded-md px-3 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-text disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
            {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
            <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
          </p>
        </div>
        <p className="text-[13px] text-muted">
          You&apos;ll be accountable for this team and the hackathon&apos;s owner on the board.
          {teamSizeMax ? ` Teams of up to ${teamSizeMax} for this event.` : ""}
          {teamSizeMax && chosen.length > teamSizeMax ? <strong className="text-text"> {chosen.length} picked is over the limit.</strong> : null}
        </p>
      </form>
      )}

      <section aria-labelledby="gaps-h" aria-live="polite" className="rounded-[10px] border border-line bg-panel px-5 py-4">
        <h2 id="gaps-h" className="font-display text-xl font-bold">Gaps</h2>
        {lineup.length === 0 ? (
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
