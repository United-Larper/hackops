import type { HackathonResult } from "@hackops/shared";
import { RESULT_META } from "@/lib/stage";

/** One result as a W / F / P square, or a dashed square while the result is still to come. */
export function ResultSquare({ result }: { result: HackathonResult | null }) {
  if (!result) {
    return (
      <span className="size-[22px] shrink-0 rounded-[3px] border border-dashed border-line-strong">
        <span className="sr-only">Awaiting result</span>
      </span>
    );
  }
  return (
    <span className={`grid size-[22px] shrink-0 place-items-center rounded-[3px] font-display text-[13px] font-bold ${RESULT_META[result].cls}`}>
      <span aria-hidden>{RESULT_META[result].letter}</span>
      <span className="sr-only">{RESULT_META[result].word}</span>
    </span>
  );
}
