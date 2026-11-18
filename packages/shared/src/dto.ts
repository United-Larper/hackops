import type { HackathonResult, Mode, Region, Role, Source, TaskStatus } from "./enums";
import type { Phase, Stage } from "./lifecycle";
import type { PrizeTrack } from "./schemas";
import type { Fit } from "./fit";

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
export type WorkspaceDto = HackathonDto & {
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

export type TeamDto = { name: string; pitch: string | null; preferredTech: string[]; preferredCats: string[]; homeCity: string };
