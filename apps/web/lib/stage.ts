import type { HackathonResult, Stage } from "@hackops/shared";

// Stage names and rules shared by server pages and client controls (a "use client" module can't export plain values to the server).

export const STAGE_NAME: Record<Stage, string> = {
  discovered: "Discovered", interested: "Interested", registered: "Registered", building: "Building",
  submitted: "Submitted", results: "Results", skipped: "Skipped",
};

export const RESULT_META = {
  won: { letter: "W", word: "Won", cls: "bg-won text-on-won" },
  finalist: { letter: "F", word: "Finalist", cls: "bg-gold text-on-gold" },
  participated: { letter: "P", word: "Participated", cls: "bg-part text-on-part" },
} satisfies Record<HackathonResult, unknown>;

export type MoveOpts = { result?: HackathonResult; note?: string };
export type AskKind = "results" | "decide";

/** Which question a stage change asks first, if any: a result for Results, the Decide note when leaving Interested. */
export function askFor(from: Stage, to: Stage): AskKind | null {
  if (to === "results") return "results";
  if (from === "interested" && (to === "registered" || to === "skipped")) return "decide";
  return null;
}
