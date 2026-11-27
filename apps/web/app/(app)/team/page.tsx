import { unstable_rethrow } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { MemberDto, TeamWorkloadDto, WorkloadRow } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { shortDate } from "@/lib/time";
import { initials } from "@/lib/workspace";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  let members: MemberDto[] = [];
  let work: TeamWorkloadDto = { hackathons: [], members: [] };
  let error: string | null = null;
  try {
    [members, work] = await Promise.all([api<MemberDto[]>("/members"), api<TeamWorkloadDto>("/team/workload")]);
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
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
        <>
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
          <Grid members={members} work={work} rows={rows} />
        </>
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

/** Members down the side, active hackathons across: each cell is the member's role, with A for the one accountable person. */
function Grid({ members, work, rows }: { members: MemberDto[]; work: TeamWorkloadDto; rows: Map<string, WorkloadRow> }) {
  const cell = (memberId: string, hackathonId: string) => rows.get(memberId)?.hackathons.find((x) => x.id === hackathonId);
  return (
    <section aria-labelledby="grid-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="grid-h" className="font-display text-2xl font-bold">Who&apos;s responsible</h2>
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <Accountable /> marks the one accountable person per hackathon.
        </p>
      </div>
      {work.hackathons.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-5 py-6 text-[15px] text-muted">
          No hackathons are Registered or Building right now. Once one is, its team shows up here.
        </p>
      ) : (
        // relative: keeps the cells' sr-only text inside the scroll box, so phones scroll the grid and not the page.
        <div className="relative overflow-x-auto rounded-[10px] border border-line bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-text align-bottom">
                <th scope="col" className="sticky left-0 bg-panel px-4 py-3 font-display text-[15px] font-bold tracking-[0.05em] uppercase sm:px-5">
                  Member
                </th>
                {work.hackathons.map((h) => {
                  const nobody = !members.some((m) => cell(m.id, h.id)?.accountable);
                  return (
                    <th key={h.id} scope="col" className="min-w-40 px-3 py-3 font-normal">
                      <Link href={`/h/${h.id}/team`} className="block font-semibold hover:underline">{h.title}</Link>
                      <span className="block text-xs text-muted">
                        {h.stage === "building" ? "Building" : "Registered"}
                        {h.submissionDueAt && ` · due ${shortDate(h.submissionDueAt)}`}
                      </span>
                      {nobody && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium">
                          <Icon name="warning-circle" size={14} /> Nobody accountable
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className="sticky left-0 bg-panel px-4 py-2.5 font-semibold whitespace-nowrap sm:px-5">{m.name}</th>
                  {work.hackathons.map((h) => {
                    const c = cell(m.id, h.id);
                    return (
                      <td key={h.id} className="px-3 py-2.5">
                        {c ? (
                          <span className="flex items-center gap-1.5">
                            {ROLE_LABEL[c.role]}
                            {c.accountable && <Accountable />}
                          </span>
                        ) : (
                          <span className="text-muted"><span aria-hidden>·</span><span className="sr-only">Not on this team</span></span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Accountable() {
  return (
    <span className="grid size-[18px] place-items-center rounded-[3px] bg-text font-display text-xs font-bold text-ground">
      <span aria-hidden>A</span>
      <span className="sr-only">Accountable</span>
    </span>
  );
}
