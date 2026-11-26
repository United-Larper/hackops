import type { HackathonResult, Mode, Region, Role, Source, TaskStatus } from "./enums";
import type { Phase, Stage } from "./lifecycle";
import type { PrizeTrack } from "./schemas";
import type { Fit } from "./fit";
import type { TrackFit } from "./tracks";
import type { WinnersBrief } from "./winners";

// What the API returns. Dates are ISO strings (UTC); the web formats them in Asia/Kuala_Lumpur.

export type CategoryDto = { slug: string; name: string };
export type MemberRefDto = { id: string; name: string };

export type HackathonDto = {
  id: string;
  source: Source;
  sourceId: string | null;
  title: string;
  url: string;
  organizer: string | null;
  mode: Mode;
  city: string | null;
  country: string | null;
  region: Region;
  startsAt: string | null;
  endsAt: string | null;
  registrationClosesAt: string | null;
  submissionDueAt: string | null;
  judgingAt: string | null;
  prizeAmount: number | null;
  prizeCurrency: string | null;
  teamSizeMax: number | null;
  eligibility: string | null;
  prizeTracks: PrizeTrack[];
  stage: Stage;
  phase: Phase | null;
  decisionNote: string | null;
  result: HackathonResult | null;
  resultNote: string | null;
  retroWentWell: string | null;
  retroToChange: string | null;
  owner: MemberRefDto | null;
  projectId: string | null;
  categories: CategoryDto[];
  /** Computed on read against the current team profile; null when no team profile exists. */
  fit: Fit | null;
  createdAt: string;
  updatedAt: string;
};

export type AssignmentDto = { member: MemberRefDto; role: Role; accountable: boolean };

export type TaskDto = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: MemberRefDto | null;
  dueAt: string | null;
  order: number;
};

export type ActivityDto = { id: string; kind: "change" | "note"; text: string; member: MemberRefDto | null; createdAt: string };

export type ProjectDto = {
  id: string;
  name: string;
  description: string | null;
  tech: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  videoUrl: string | null;
  slidesUrl: string | null;
  devpostUrl: string | null;
};

/** GET /projects: each project with how many hackathons it's linked to. */
export type ProjectSummaryDto = ProjectDto & { entries: number };

/** GET /projects/:id: the project plus every hackathon it was entered in, newest first. */
export type ProjectDetailDto = ProjectDto & {
  hackathons: { id: string; title: string; stage: Stage; result: HackathonResult | null; endsAt: string | null }[];
};

/** GET /hackathons/:id: everything a workspace needs in one read. */
export type WorkspaceDto = Omit<HackathonDto, "prizeTracks"> & {
  /** Each track with the prize-track finder's verdict for the linked project's tech and the event's categories. */
  prizeTracks: (PrizeTrack & { fit: TrackFit })[];
  assignments: AssignmentDto[];
  tasks: TaskDto[];
  project: ProjectDto | null;
  activity: ActivityDto[];
};

export type MemberDto = {
  id: string;
  name: string;
  email: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  skills: string[];
  preferredRoles: Role[];
  organisation: string | null;
  tshirtSize: string | null;
  dietary: string | null;
};

/** GET /members/:id: the member plus their past hackathons (Submitted or Results), newest first. */
export type MemberDetailDto = MemberDto & {
  history: { hackathon: { id: string; title: string; stage: Stage; endsAt: string | null }; role: Role; accountable: boolean; result: HackathonResult | null }[];
};

/** One public portfolio entry: a Submitted or Results hackathon. Public fields only; no contact or sign-up details, no internal notes. */
export type PortfolioEntryDto = {
  id: string;
  title: string;
  url: string;
  organizer: string | null;
  mode: Mode;
  city: string | null;
  country: string | null;
  endsAt: string | null;
  stage: "submitted" | "results";
  result: HackathonResult | null;
  categories: CategoryDto[];
  project: Omit<ProjectDto, "id"> | null;
  team: { id: string; name: string; role: Role }[];
  /** Seed data (source "demo"): the page must label it, never present it as a real result. */
  sample: boolean;
};

/** GET /portfolio: the team's name and pitch, entries newest first, and the filter options (from all entries, before filtering). */
export type PortfolioDto = {
  team: { name: string; pitch: string | null } | null;
  entries: PortfolioEntryDto[];
  members: MemberRefDto[];
  categories: CategoryDto[];
};

/** GET /team. */
export type TeamDto = { name: string; pitch: string | null; preferredTech: string[]; preferredCats: string[]; homeCity: string };

/**
 * GET /signup-profile?token=: what the bookmarklet may fill, and nothing else. Open to any origin, so it needs the token,
 * and a token only ever returns its owner's own fields.
 */
export type SignupProfileDto = {
  team: { name: string; pitch: string | null };
  member: { name: string; email: string | null; githubUrl: string | null; linkedinUrl: string | null; organisation: string | null; tshirtSize: string | null; dietary: string | null };
};

/** POST /auth/login. The token goes in the web app's httpOnly cookie; the API keeps only its hash. */
export type SessionDto = { token: string; expiresAt: string; member: MemberRefDto };

/** GET /auth/me: who is signed in, plus their own bookmarklet and calendar secret (null until made). */
export type MeDto = MemberRefDto & { fillToken: string | null };

/** GET /hackathons/:id/winners. `brief` is null for events without past Devpost data (not Devpost, no organizer, no past editions). */
export type WinnersDto = { organizer: string | null; brief: WinnersBrief | null };

/** One line of the pre-submission check. `ok` is null when it couldn't be checked (e.g. a repo not on GitHub). */
export type CheckItem = { key: "repo" | "readme" | "video" | "demo" | "checklist" | "tracks"; label: string; ok: boolean | null; detail: string };
export type SubmissionCheckDto = { checkedAt: string; items: CheckItem[] };
