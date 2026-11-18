import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BOARD_STAGES, type BoardDto, type ProjectDetailDto } from "@hackops/shared";
import { PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { Entries } from "../entries";
import { ProjectForm } from "../project-form";

type Props = { params: Promise<{ id: string }> };

const getProject = cache(async (id: string) => {
  try {
    return await api<ProjectDetailDto>(`/projects/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await getProject((await params).id)).name };
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const [p, board] = await Promise.all([getProject(id), api<BoardDto>("/hackathons/board")]);
  // Anything on the board (Interested to Results) that this project isn't already entered in.
  const candidates = BOARD_STAGES.flatMap((s) => board[s])
    .filter((h) => h.projectId !== p.id)
    .map((h) => ({ id: h.id, title: h.title, stage: h.stage, hasOther: h.projectId !== null }));
  return (
    <>
      <PageHeader title={p.name} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,48rem)_minmax(280px,360px)] lg:items-start">
        <ProjectForm key={p.id} project={p} />
        <Entries project={p} candidates={candidates} />
      </div>
    </>
  );
}
