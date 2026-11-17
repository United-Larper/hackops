import type { MemberDto } from "@hackops/shared";
import { api } from "@/lib/api";
import { getWorkspace } from "@/lib/workspace";
import { TaskBoard } from "./tasks";

export default async function TasksTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [h, members] = await Promise.all([getWorkspace(id), api<MemberDto[]>("/members")]);
  return <TaskBoard hackathonId={h.id} tasks={h.tasks} members={members} />;
}
