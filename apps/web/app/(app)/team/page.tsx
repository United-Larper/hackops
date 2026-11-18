import type { Metadata } from "next";
import Link from "next/link";
import type { MemberDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { initials } from "@/lib/workspace";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  let members: MemberDto[] = [];
  let error: string | null = null;
  try {
    members = await api<MemberDto[]>("/members");
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Couldn't load the team.";
  }

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
        <ul className="divide-y divide-line rounded-[10px] border border-line bg-panel">
          {members.map((m) => (
            <li key={m.id}>
              <Link href={`/team/${m.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-panel-2 sm:px-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rail font-display text-sm font-bold text-rail-strong" aria-hidden>
                  {initials(m.name)}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{m.name}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {[m.preferredRoles.map((r) => ROLE_LABEL[r]).join(", "), m.skills.join(" · ")].filter(Boolean).join(" — ") || "No roles or skills yet"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
