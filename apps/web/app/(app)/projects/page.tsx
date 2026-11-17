import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <>
      <PageHeader title="Projects" />
      <EmptyState title="No projects yet">Add the projects the team builds, with repo, demo, video and slide links, then link each one to the hackathons it was entered in.</EmptyState>
    </>
  );
}
