import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Discover" };

export default function Page() {
  return (
    <>
      <PageHeader title="Discover" />
      <EmptyState title="No hackathons found yet">Devpost, MLH and the Malaysian list are checked every morning at 08:00 MYT. New events show up here ranked by how well they fit the team, with the next deadline and prize on each row.</EmptyState>
    </>
  );
}
