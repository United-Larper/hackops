import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Portfolio" };

export default function Page() {
  return (
    <>
      <PageHeader title="Portfolio" />
      <EmptyState title="Nothing to show yet">Every hackathon the team submits to becomes an entry here, with the project, the tech, who built it and the result. This page is public so members can link it from a CV.</EmptyState>
    </>
  );
}
