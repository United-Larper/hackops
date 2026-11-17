import type { HackathonResult, Mode, Region, Role, Source, TaskStatus } from "./enums";
import type { Phase, Stage } from "./lifecycle";
import type { PrizeTrack } from "./schemas";

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

export type TeamDto = { name: string; pitch: string | null; preferredTech: string[]; preferredCats: string[]; homeCity: string };
