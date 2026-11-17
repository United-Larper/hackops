import Link from "next/link";
import { notFound } from "next/navigation";
import type { WorkspaceDto } from "@hackops/shared";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";

// ponytail: placeholder until the phase 05 workspace replaces this page at the same URL.
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let h: WorkspaceDto;
  try {
    h = await api<WorkspaceDto>(`/hackathons/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <>
      <PageHeader title={h.title} />
      <EmptyState title="The workspace comes next">
        Overview, tasks, team and roles, timeline and retro for this hackathon arrive in phase 05.{" "}
        {h.decisionNote && <>Decision note: “{h.decisionNote}”. </>}
        <Link href="/board" className="underline">Back to the board</Link>
      </EmptyState>
    </>
  );
}
