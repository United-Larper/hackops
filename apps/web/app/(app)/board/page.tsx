import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Board" };

const COLUMNS = [
  { name: "Interested", hint: "Picked from Discover. Decide: register or skip." },
  { name: "Registered", hint: "Team and roles set; the task list starts here." },
  { name: "Building", hint: "The match clock runs to submission." },
  { name: "Submitted", hint: "Waiting for judging." },
  { name: "Results", hint: "Won, finalist or participated, plus a retro." },
];

export default function BoardPage() {
  return (
    <>
      <PageHeader title="Board" />
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="grid min-w-[1000px] grid-cols-5 gap-3.5" aria-label="Stages">
          {COLUMNS.map((c) => (
            <li key={c.name} className="flex min-h-[340px] flex-col">
              <h2 className="mb-2.5 flex justify-between border-b-2 border-line-strong px-0.5 pb-2.5 font-display text-[17px] font-bold tracking-[0.05em] uppercase">
                {c.name}
                <span className="text-muted">0</span>
              </h2>
              <p className="flex-1 rounded-lg border border-dashed border-line p-3 text-sm leading-snug text-muted">{c.hint}</p>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
