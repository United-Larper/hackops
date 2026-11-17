export const SOURCES = ["devpost", "mlh", "my-list", "manual", "demo"] as const;
export type Source = (typeof SOURCES)[number];

export const MODES = ["online", "in_person", "hybrid"] as const;
export type Mode = (typeof MODES)[number];

export const ROLES = ["lead", "developer", "designer", "pitch"] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const RESULTS = ["won", "finalist", "participated"] as const;
export type HackathonResult = (typeof RESULTS)[number];

export const REGIONS = ["malaysia", "overseas", "online"] as const;
export type Region = (typeof REGIONS)[number];

/** Online events are their own region; otherwise Malaysia or not. */
export function regionOf(h: { mode: string; country: string | null }): Region {
  if (h.mode === "online") return "online";
  return h.country?.trim().toLowerCase() === "malaysia" ? "malaysia" : "overseas";
}
