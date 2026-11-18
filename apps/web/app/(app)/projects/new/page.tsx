import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "Add project" };

export default function NewProject() {
  return (
    <>
      <PageHeader title="Add project" />
      <div className="max-w-3xl">
        <ProjectForm />
      </div>
    </>
  );
}
