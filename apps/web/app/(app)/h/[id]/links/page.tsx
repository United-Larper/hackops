import type { ProjectDetailDto, ProjectDto } from "@hackops/shared";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { getWorkspace } from "@/lib/workspace";
import { CheckLoading, SubmissionCheck } from "./check";
import { LinksForm, PickProject } from "./links";

export default async function LinksTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await getWorkspace(id);
  const [projects, detail] = await Promise.all([
    h.project ? Promise.resolve([] as ProjectDto[]) : api<ProjectDto[]>("/projects"),
    h.project ? api<ProjectDetailDto>(`/projects/${encodeURIComponent(h.project.id)}`) : null,
  ]);
  const sharedWith = detail ? detail.hackathons.length - 1 : 0;

  return (
    <div className="flex flex-col gap-5">
      {h.project ? (
        <section aria-labelledby="project-h" className="flex flex-col gap-3">
          <div>
            <h2 id="project-h" className="font-display text-2xl font-bold">{h.project.name}</h2>
            {h.project.description && <p className="mt-1 max-w-[62ch] text-[15px] text-muted">{h.project.description}</p>}
            {h.project.tech.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tech">
                {h.project.tech.map((t) => <li key={t} className="rounded-[3px] bg-panel-2 px-2 py-0.5 text-xs font-medium">{t}</li>)}
              </ul>
            )}
          </div>
          <LinksForm hackathonId={h.id} project={h.project} sharedWith={sharedWith} />
        </section>
      ) : (
        <PickProject hackathonId={h.id} projects={projects} suggested={`${h.title} entry`} />
      )}
      <Suspense fallback={<CheckLoading />}>
        <SubmissionCheck id={h.id} />
      </Suspense>
    </div>
  );
}
