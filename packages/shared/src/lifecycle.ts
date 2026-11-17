// Spec §5: the lifecycle phase is derived from the stage, never stored.
export const STAGES = ["discovered", "interested", "registered", "building", "submitted", "results", "skipped"] as const;
export type Stage = (typeof STAGES)[number];

export const PHASES = ["initiation", "planning", "execution", "closing"] as const;
export type Phase = (typeof PHASES)[number];

const PHASE_BY_STAGE: Record<Stage, Phase | null> = {
  discovered: "initiation",
  interested: "initiation",
  registered: "planning",
  building: "execution", // monitoring runs alongside execution
  submitted: "closing",
  results: "closing",
  skipped: null,
};

export function phaseOf(stage: Stage): Phase | null {
  return PHASE_BY_STAGE[stage];
}
