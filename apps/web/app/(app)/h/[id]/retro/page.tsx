import { EmptyState } from "@/components/shell/page-header";
import { getWorkspace } from "@/lib/workspace";
import { RetroForm } from "./retro";

export default async function RetroTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await getWorkspace(id);
  if (h.stage !== "submitted" && h.stage !== "results") {
    return <EmptyState title="The retro opens after submission">Once this hackathon is Submitted, record the result and what to keep or change here.</EmptyState>;
  }
  return (
    <RetroForm hackathonId={h.id} stage={h.stage} result={h.result} resultNote={h.resultNote} wentWell={h.retroWentWell} toChange={h.retroToChange} />
  );
}
