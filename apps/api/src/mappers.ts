import {
  fitScore,
  phaseOf,
  trackFit,
  type PrizeTrack,
  type FitTeam,
  regionOf,
  type ActivityDto,
  type HackathonDto,
  type MemberDto,
  type ProjectDto,
  type Stage,
  type TaskDto,
  type TeamDto,
  type WorkspaceDto,
} from "@hackops/shared";
import type { Prisma } from "./generated/prisma/client";
import type { PrismaService } from "./prisma.service";

// Database rows → API DTOs. Lists stored as JSON strings are parsed here, dates become ISO strings.

const list = <T = string>(s: string): T[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
/** Stored prize tracks; rows from before phase 10 have no "entering" mark. */
export const tracksOf = (s: string): PrizeTrack[] => list<PrizeTrack>(s).map((t) => ({ ...t, entering: t.entering ?? false }));
const iso = (d: Date | null) => (d ? d.toISOString() : null);
const ref = (m: { id: string; name: string } | null) => (m ? { id: m.id, name: m.name } : null);

export const HACKATHON_INCLUDE = { categories: true, owner: true } satisfies Prisma.HackathonInclude;
type HackathonRow = Prisma.HackathonGetPayload<{ include: typeof HACKATHON_INCLUDE }>;

export function toHackathonDto(h: HackathonRow, team: FitTeam | null = null, now = new Date()): HackathonDto {
  const categories = h.categories.map((c) => ({ slug: c.slug, name: c.name }));
  return {
    ...h,
    fit: team ? fitScore({ ...h, categories }, team, now) : null,
    source: h.source as HackathonDto["source"],
    mode: h.mode as HackathonDto["mode"],
    stage: h.stage as Stage,
    phase: phaseOf(h.stage as Stage),
    result: h.result as HackathonDto["result"],
    region: regionOf(h),
    prizeTracks: tracksOf(h.prizeTracks),
    startsAt: iso(h.startsAt),
    endsAt: iso(h.endsAt),
    registrationClosesAt: iso(h.registrationClosesAt),
    submissionDueAt: iso(h.submissionDueAt),
    judgingAt: iso(h.judgingAt),
    owner: ref(h.owner),
    categories,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

export const WORKSPACE_INCLUDE = {
  ...HACKATHON_INCLUDE,
  assignments: { include: { member: true } },
  tasks: { include: { assignee: true }, orderBy: [{ order: "asc" }, { id: "asc" }] },
  project: true,
  activity: { include: { member: true }, orderBy: { createdAt: "desc" }, take: 50 },
} satisfies Prisma.HackathonInclude;
type WorkspaceRow = Prisma.HackathonGetPayload<{ include: typeof WORKSPACE_INCLUDE }>;

export function toTaskDto(t: Prisma.TaskGetPayload<{ include: { assignee: true } }>): TaskDto {
  return { id: t.id, title: t.title, status: t.status as TaskDto["status"], assignee: ref(t.assignee), dueAt: iso(t.dueAt), order: t.order };
}

export function toActivityDto(a: Prisma.ActivityGetPayload<{ include: { member: true } }>): ActivityDto {
  return { id: a.id, kind: a.kind as ActivityDto["kind"], text: a.text, member: ref(a.member), createdAt: a.createdAt.toISOString() };
}

export function toProjectDto(p: Prisma.ProjectGetPayload<object>): ProjectDto {
  return { ...p, tech: list(p.tech) };
}

export function toWorkspaceDto(h: WorkspaceRow, team: FitTeam | null = null): WorkspaceDto {
  const base = toHackathonDto(h, team);
  const tech = h.project ? list(h.project.tech) : [];
  const categoryWords = h.categories.flatMap((c) => [c.name, ...list(c.keywords)]);
  return {
    ...base,
    prizeTracks: base.prizeTracks.map((t) => ({ ...t, fit: trackFit(t, tech, categoryWords) })),
    assignments: h.assignments.map((a) => ({ member: { id: a.member.id, name: a.member.name }, role: a.role as never, accountable: a.accountable })),
    tasks: h.tasks.map(toTaskDto),
    project: h.project ? toProjectDto(h.project) : null,
    activity: h.activity.map(toActivityDto),
  };
}

export function toMemberDto(m: Prisma.MemberGetPayload<object>): MemberDto {
  return { ...m, skills: list(m.skills), preferredRoles: list(m.preferredRoles) };
}

export function toTeamDto(t: Prisma.TeamGetPayload<object>): TeamDto {
  return { name: t.name, pitch: t.pitch, preferredTech: list(t.preferredTech), preferredCats: list(t.preferredCats), homeCity: t.homeCity };
}

/** The team profile as the fit score needs it, or null before a team profile exists. */
export async function fitTeam(db: PrismaService): Promise<FitTeam | null> {
  const [team, size] = await Promise.all([db.team.findUnique({ where: { id: "team" } }), db.member.count()]);
  return team ? { preferredCats: list(team.preferredCats), homeCity: team.homeCity, size: Math.max(1, size) } : null;
}

/** Sort key for "newest first": when the event ended, else its submission deadline, else its last edit. */
export const newest = (h: { endsAt: Date | null; submissionDueAt: Date | null; updatedAt: Date }) => (h.endsAt ?? h.submissionDueAt ?? h.updatedAt).getTime();
