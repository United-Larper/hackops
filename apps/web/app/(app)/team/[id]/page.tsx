import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { MemberDetailDto } from "@hackops/shared";
import { PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { ResultSquare } from "@/components/result";
import { MYT } from "@/lib/time";
import { MemberForm } from "../member-form";

type Props = { params: Promise<{ id: string }> };

const getMember = cache(async (id: string) => {
  try {
    return await api<MemberDetailDto>(`/members/${encodeURIComponent(id)}`);
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,48rem)_minmax(260px,340px)] lg:items-start">
        <MemberForm key={m.id} member={m} />
        <History m={m} />
      </div>
    </>
  );
}

const monthYear = new Intl.DateTimeFormat("en-MY", { month: "short", year: "numeric", timeZone: MYT });

/** Past hackathons (Submitted or Results), newest first, with the role held and the result. */
function History({ m }: { m: MemberDetailDto }) {
  return (
    <section aria-labelledby="history-h" className="rounded-[10px] border border-line bg-panel px-5 py-4">
      <h2 id="history-h" className="font-display text-xl font-bold">History</h2>
      {m.history.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">No past hackathons yet. Once a hackathon {m.name} is on is submitted, it shows here with their role and the result.</p>
      ) : (
        <ol className="mt-2 divide-y divide-line">
          {m.history.map(({ hackathon: h, role, accountable, result }) => (
            <li key={h.id} className="flex items-center gap-3 py-2.5">
              <ResultSquare result={result} />
              <span className="min-w-0">
                <Link href={`/h/${h.id}`} className="block truncate font-semibold hover:underline">{h.title}</Link>
                <span className="block text-[13px] text-muted">
                  {ROLE_LABEL[role]}
                  {accountable && ", accountable"}
                  {h.endsAt && ` · ${monthYear.format(new Date(h.endsAt))}`}
                  {!result && " · awaiting result"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
