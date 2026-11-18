import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Add member" };

export default function NewMember() {
  return (
    <>
      <PageHeader title="Add member" />
      <div className="max-w-3xl">
        <MemberForm />
      </div>
    </>
  );
}
