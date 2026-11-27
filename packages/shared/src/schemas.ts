import { z } from "zod";
import { MODES, RESULTS, ROLES, SOURCES, TASK_STATUSES, REGIONS } from "./enums";
import { STAGES } from "./lifecycle";

// API input schemas. Every write to the API is checked against one of these.

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullish();
const url = z.url({ protocol: /^https?$/ }).max(2000);
const optionalUrl = url.nullish();
const date = z.coerce.date().nullish();
const tags = z.array(z.string().trim().min(1).max(60)).max(50);

/**
 * PATCH schema from an input schema: every field optional and its `.default()` removed.
 * Zod 4 keeps defaults inside `.partial()`, so a one-field PATCH would otherwise reset every defaulted field.
 */
function patchOf<S extends z.ZodRawShape>(schema: z.ZodObject<S>) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([k, v]) => [k, ((v instanceof z.ZodDefault ? v.unwrap() : v) as z.ZodType).optional()]),
  );
  return z.object(shape) as unknown as z.ZodObject<{
    [K in keyof S]: z.ZodOptional<S[K] extends z.ZodDefault<infer I extends z.ZodType> ? I : S[K]>;
  }>;
}

export const PrizeTrackSchema = z.object({
  name: text(200),
  sponsor: optionalText(200),
  prize: optionalText(200),
  /** What the judges look for; the prize-track finder matches against it. */
  description: optionalText(2000),
  /** The team plans to enter this track. */
  entering: z.boolean().default(false),
});
export type PrizeTrack = z.infer<typeof PrizeTrackSchema>;

export const HackathonInput = z.object({
  title: text(200),
  url,
  source: z.enum(SOURCES),
  sourceId: optionalText(200),
  organizer: optionalText(200),
  mode: z.enum(MODES),
  city: optionalText(100),
  country: optionalText(100),
  startsAt: date,
  endsAt: date,
  registrationClosesAt: date,
  submissionDueAt: date,
  judgingAt: date,
  prizeAmount: z.number().int().min(0).nullish(),
  prizeCurrency: z.string().trim().length(3).toUpperCase().nullish(),
  teamSizeMax: z.number().int().min(1).max(50).nullish(),
  eligibility: optionalText(4000), // the curated list keeps every tracker fact here
  prizeTracks: z.array(PrizeTrackSchema).max(50).default([]),
  categories: z.array(z.string().trim().min(1)).max(20).default([]), // category slugs
});
export type HackathonInput = z.infer<typeof HackathonInput>;

/** PATCH: any hackathon field, plus the workspace fields. Stage changes go through StageInput. */
export const HackathonPatch = patchOf(HackathonInput).extend({
  projectId: z.string().nullish(),
  decisionNote: optionalText(2000),
  resultNote: optionalText(2000),
  retroWentWell: optionalText(4000),
  retroToChange: optionalText(4000),
});
export type HackathonPatch = z.infer<typeof HackathonPatch>;

export const StageInput = z.object({
  stage: z.enum(STAGES),
  result: z.enum(RESULTS).optional(),
  note: optionalText(2000),
});
export type StageInput = z.infer<typeof StageInput>;

export const HackathonQuery = z.object({
  stage: z.enum(STAGES).optional(),
  category: z.string().optional(),
  region: z.enum(REGIONS).optional(),
  q: z.string().trim().max(200).optional(),
  /** "1": hide events whose next deadline has passed. */
  open: z.literal("1").optional(),
  /** Only events whose next deadline is within this many days. */
  closesWithin: z.coerce.number().int().min(1).max(365).optional(),
  sort: z.enum(["fit", "deadline", "created"]).default("created"),
});
export type HackathonQuery = z.infer<typeof HackathonQuery>;

/** GET /portfolio filters: `member` is the link a member puts in their CV. */
export const PortfolioQuery = z.object({ category: z.string().max(100).optional(), member: z.string().max(100).optional() });
export type PortfolioQuery = z.infer<typeof PortfolioQuery>;

/** GET /deadlines: how many days ahead the due-soon panel looks. */
export const DeadlinesQuery = z.object({ days: z.coerce.number().int().min(1).max(60).default(7) });
export type DeadlinesQuery = z.infer<typeof DeadlinesQuery>;

/** GET /hackathons/board filters. Online vs in person: hybrid events count as both. */
export const BoardQuery = z.object({
  category: z.string().optional(),
  owner: z.string().optional(),
  region: z.enum(REGIONS).optional(),
  mode: z.enum(["online", "in_person"]).optional(),
  /** "1": only cards whose next deadline falls in the next 7 days. */
  week: z.literal("1").optional(),
  /** "1": include the skipped column. */
  skipped: z.literal("1").optional(),
});
export type BoardQuery = z.infer<typeof BoardQuery>;

export const TaskInput = z.object({
  title: text(200),
  status: z.enum(TASK_STATUSES).default("todo"),
  assigneeId: z.string().nullish(),
  dueAt: date,
});
export type TaskInput = z.infer<typeof TaskInput>;
export const TaskPatch = patchOf(TaskInput);
export type TaskPatch = z.infer<typeof TaskPatch>;

export const TeamAssignmentsInput = z
  .array(z.object({ memberId: z.string().min(1), role: z.enum(ROLES), accountable: z.boolean().default(false) }))
  .max(20)
  .refine((a) => new Set(a.map((x) => x.memberId)).size === a.length, "A member can only be added once")
  .refine((a) => a.length === 0 || a.filter((x) => x.accountable).length === 1, "Exactly one member must be accountable");
export type TeamAssignmentsInput = z.infer<typeof TeamAssignmentsInput>;

/** The note's author is whoever is signed in. */
export const NoteInput = z.object({ text: text(4000) });
export type NoteInput = z.infer<typeof NoteInput>;

export const MemberInput = z.object({
  name: text(120),
  email: z.email().max(200).toLowerCase().nullish(), // the login; lowercased so sign-in ignores case
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  skills: tags.default([]),
  preferredRoles: z.array(z.enum(ROLES)).max(4).default([]),
  organisation: optionalText(200),
  tshirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]).nullish(),
  dietary: optionalText(200),
});
export type MemberInput = z.infer<typeof MemberInput>;
export const MemberPatch = patchOf(MemberInput);

export const ProjectInput = z.object({
  name: text(120),
  description: optionalText(4000),
  tech: tags.default([]),
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  videoUrl: optionalUrl,
  slidesUrl: optionalUrl,
  devpostUrl: optionalUrl,
});
export type ProjectInput = z.infer<typeof ProjectInput>;
export const ProjectPatch = patchOf(ProjectInput);

export const TeamInput = z.object({
  name: text(120),
  pitch: optionalText(2000),
  preferredCats: tags.default([]),
  homeCity: text(100).default("Kuala Lumpur"),
});
export type TeamInput = z.infer<typeof TeamInput>;

/** Sign-in. No length rule here, so a failed sign-in never hints at the password policy. */
/** A 6-digit authenticator code; spaces are dropped, since apps show it as "123 456". */
const code = z.string().max(20).transform((s) => s.replace(/\s/g, "")).pipe(z.string().regex(/^\d{6}$/,"Enter the 6-digit code"));

export const LoginInput = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().min(1).max(200), code: code.optional() });
export type LoginInput = z.infer<typeof LoginInput>;

/** A password HackOps will store: 10 to 200 characters (scrypt cost stays bounded). */
export const password = z.string().min(10, "Use at least 10 characters").max(200);
export const PasswordInput = z.object({ current: z.string().min(1).max(200), next: password });
export type PasswordInput = z.infer<typeof PasswordInput>;

/** Turn two-step sign-in on: the key from /auth/two-step/setup and a code it made. Off needs only `password` and `code`. */
export const TwoStepInput = z.object({ password: z.string().min(1).max(200), code, secret: z.string().regex(/^[A-Z2-7]{32}$/).optional() });
export type TwoStepInput = z.infer<typeof TwoStepInput>;
