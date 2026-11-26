import type { PrizeTrack } from "./schemas";

// Prize-track finder (phase 10): keyword match, no AI.

export type TrackFit = "fits" | "maybe" | "no";

/** Placement and catch-all prizes every entry is judged for. */
const GENERAL = /\b(overall|grand|1st|2nd|3rd|first|second|third|place|runner|honou?rable|people'?s choice|best hack|open)\b/i;

const words = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

/**
 * "fits": the track's text names the project's tech. "maybe": it names one of the event's category keywords,
 * or it's a placement prize. "no": neither.
 * ponytail: whole-word keyword match; "React" won't match "ReactJS". Upgrade path: the AI hook in phase 11.
 */
export function trackFit(track: Pick<PrizeTrack, "name" | "sponsor" | "description">, tech: string[], categoryWords: string[]): TrackFit {
  const hay = words([track.name, track.sponsor, track.description].filter(Boolean).join(" "));
  const has = (term: string) => {
    const t = words(term);
    return t.trim() !== "" && hay.includes(t);
  };
  if (tech.some(has)) return "fits";
  if (categoryWords.some(has) || GENERAL.test(track.name)) return "maybe";
  return "no";
}
