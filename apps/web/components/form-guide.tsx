export type Result = "W" | "F" | "P";

const STYLE: Record<Result, string> = {
  W: "bg-won text-on-won",
  F: "bg-gold text-on-gold",
  P: "bg-part text-on-part",
};
const WORD: Record<Result, string> = { W: "won", F: "finalist", P: "participated" };

/** Recent results as W / F / P squares, oldest first. */
export function FormGuide({ results }: { results: Result[] }) {
  if (results.length === 0) return <p className="text-sm text-rail-muted">No results yet</p>;
  return (
    <ol className="flex gap-1" aria-label={`Recent results: ${results.map((r) => WORD[r]).join(", ")}`}>
      {results.map((r, i) => (
        <li key={i} aria-hidden className={`grid size-[22px] place-items-center rounded-[3px] font-display text-[13px] font-bold ${STYLE[r]}`}>
          {r}
        </li>
      ))}
    </ol>
  );
}
