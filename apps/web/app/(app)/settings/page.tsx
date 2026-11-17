import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" />
      <EmptyState title="Team profile and sign-up assist">The team profile and each member's sign-up details live here, along with the bookmark button that fills registration forms for you to review and submit.</EmptyState>
    </>
  );
}
