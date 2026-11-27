import { unstable_rethrow } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { ProjectSummaryDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { PROJECT_LINKS } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  let projects: ProjectSummaryDto[] = [];
  let error: string | null = null;
  try {
    projects = await api<ProjectSummaryDto[]>("/projects");
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
    error = e instanceof ApiError ? e.message : "Couldn't load the projects.";
  }

  return (
    <>
      <PageHeader
        title="Projects"
        action={
          <Link href="/projects/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-rail px-4 text-sm font-semibold text-gold transition-colors hover:bg-rail-2">
            <Icon name="plus" size={16} /> Add project
          </Link>
        }
      />
      {error ? (
        <EmptyState title="Projects unavailable">{error}</EmptyState>
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet">Add the projects the team builds, with repo, demo, video and slide links, then link each one to the hackathons it was entered in.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-[10px] border border-line bg-panel">
          {projects.map((p) => {
            const missing = PROJECT_LINKS.filter((l) => !p[l.key]).map((l) => l.label.toLowerCase());
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="grid gap-x-6 gap-y-2 px-4 py-3 transition-colors hover:bg-panel-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{p.name}</span>
                    {p.description && <span className="block truncate text-[13px] text-muted">{p.description}</span>}
                    {p.tech.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.tech.map((t) => <span key={t} className="rounded-[3px] bg-panel-2 px-2 py-0.5 text-xs font-medium">{t}</span>)}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-muted sm:text-right">
                    <span className="block">
                      <span className="font-display text-xl font-bold text-text tabular-nums">{p.entries}</span> {p.entries === 1 ? "hackathon" : "hackathons"}
                    </span>
                    <span className="block">{missing.length === 0 ? "All links in" : `No ${missing.join(", ")}`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
