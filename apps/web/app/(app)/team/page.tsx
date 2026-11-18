import type { Metadata } from "next";
import Link from "next/link";
import type { MemberDto, TeamWorkloadDto, WorkloadRow } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { initials } from "@/lib/workspace";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  let members: MemberDto[] = [];
  let work: TeamWorkloadDto = { hackathons: [], members: [] };
  let error: string | null = null;
  try {
    [members, work] = await Promise.all([api<MemberDto[]>("/members"), api<TeamWorkloadDto>("/team/workload")]);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Couldn't load the team.";
  }
  const rows = new Map(work.members.map((r) => [r.member.id, r]));
  const title = new Map(work.hackathons.map((h) => [h.id, h.title]));
  const busiest = Math.max(1, ...work.members.map((r) => r.openTasks));

  return (
    <>
      <PageHeader
        title="Team"
        action={
          <Link href="/team/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-rail px-4 text-sm font-semibold text-gold transition-colors hover:bg-rail-2">
            <Icon name="plus" size={16} /> Add member
          </Link>
        }
      />
      {error ? (
        <EmptyState title="Team unavailable">{error}</EmptyState>
      ) : members.length === 0 ? (
        <EmptyState title="No members yet">Add each member with their skills and preferred roles. Their workload across active hackathons and who is accountable for what will show up here.</EmptyState>
      ) : (
        <section aria-labelledby="members-h" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="members-h" className="font-display text-2xl font-bold">Members</h2>
            <p className="text-[13px] text-muted">Workload counts Registered and Building hackathons, and open tasks on them.</p>
          </div>
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-panel">
            {members.map((m) => (
              <MemberRow key={m.id} m={m} row={rows.get(m.id)} busiest={busiest} title={title} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function MemberRow({ m, row, busiest, title }: { m: MemberDto; row?: WorkloadRow; busiest: number; title: Map<string, string> }) {
  const active = row?.hackathons.length ?? 0;
  const open = row?.openTasks ?? 0;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(200px,280px)] sm:items-center sm:px-5">
      <Link href={`/team/${m.id}`} className="group flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rail font-display text-sm font-bold text-rail-strong" aria-hidden>
          {initials(m.name)}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold group-hover:underline">{m.name}</span>
          <span className="block truncate text-[13px] text-muted">
            {[m.preferredRoles.map((r) => ROLE_LABEL[r]).join(", "), m.skills.join(" · ")].filter(Boolean).join(" — ") || "No roles or skills yet"}
          </span>
        </span>
      </Link>
      <div className="pl-12 sm:pl-0">
        <p className="flex items-baseline gap-4 text-[13px] text-muted">
          <span>
            <span className="font-display text-xl font-bold text-text tabular-nums">{active}</span> active
          </span>
          <span>
            <span className="font-display text-xl font-bold text-text tabular-nums">{open}</span> open {open === 1 ? "task" : "tasks"}
          </span>
        </p>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden>
          <span className="block h-full rounded-full bg-text" style={{ width: `${Math.round((open / busiest) * 100)}%` }} />
        </span>
        {row?.clashes.map(([a, b]) => (
          <p key={`${a}-${b}`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium">
            <Icon name="warning-circle" size={16} className="mt-px shrink-0" />
            <span>
              Dates clash: {title.get(a)} and {title.get(b)}
            </span>
          </p>
        ))}
      </div>
    </li>
  );
}
