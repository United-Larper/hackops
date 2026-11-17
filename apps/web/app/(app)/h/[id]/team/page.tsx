import type { MemberDto } from "@hackops/shared";
import { api } from "@/lib/api";
import { getWorkspace } from "@/lib/workspace";
import { TeamForm } from "./team";

export default async function TeamTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [h, members] = await Promise.all([getWorkspace(id), api<MemberDto[]>("/members")]);
  return <TeamForm hackathonId={h.id} members={members} assignments={h.assignments} categories={h.categories} teamSizeMax={h.teamSizeMax} />;
}
