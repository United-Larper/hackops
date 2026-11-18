import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { MemberDto } from "@hackops/shared";
import { PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { MemberForm } from "../member-form";

type Props = { params: Promise<{ id: string }> };

const getMember = cache(async (id: string) => {
  try {
    return await api<MemberDto>(`/members/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await getMember((await params).id)).name };
}

export default async function MemberPage({ params }: Props) {
  const m = await getMember((await params).id);
  return (
    <>
      <PageHeader title={m.name} />
      <div className="max-w-3xl">
        <MemberForm key={m.id} member={m} />
      </div>
    </>
  );
}
