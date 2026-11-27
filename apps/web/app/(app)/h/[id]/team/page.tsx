import { overlaps, type MeDto, type MemberDto, type TeamWorkloadDto } from "@hackops/shared";
import { api } from "@/lib/api";
import { getWorkspace } from "@/lib/workspace";
import { TeamForm } from "./team";

export default async function TeamTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [h, members, work, me] = await Promise.all([
    getWorkspace(id), api<MemberDto[]>("/members"), api<TeamWorkloadDto>("/team/workload"), api<MeDto>("/auth/me"),
  ]);
  // Per member: their other active hackathons whose dates overlap this one.
  const byId = new Map(work.hackathons.map((x) => [x.id, x]));
  const clashes = Object.fromEntries(
    work.members.map((r) => [
      r.member.id,
      r.hackathons.map((x) => byId.get(x.id)!).filter((o) => o.id !== h.id && overlaps(h, o)).map((o) => o.title),
    ]),
  );
  return <TeamForm hackathonId={h.id} meId={me.id} members={members} assignments={h.assignments} categories={h.categories} teamSizeMax={h.teamSizeMax} clashes={clashes} />;
}
