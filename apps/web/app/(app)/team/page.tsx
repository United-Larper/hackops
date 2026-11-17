import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return (
    <>
      <PageHeader title="Team" />
      <EmptyState title="No members yet">Add each member with their skills and preferred roles. Their workload across active hackathons and who is accountable for what will show up here.</EmptyState>
    </>
  );
}
