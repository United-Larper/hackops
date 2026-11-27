import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import {
  ACTIVE_STAGES, MemberInput, MemberPatch, ProjectInput, ProjectPatch, TeamInput, workload,
  type HackathonResult, type MemberDetailDto, type ProjectDetailDto, type SignupProfileDto, type ProjectSummaryDto, type Role, type Stage, type TeamWorkloadDto,
} from "@hackops/shared";
import { z } from "zod";
import { fillTokenOwner } from "./auth";
import { ZodPipe } from "./common/zod.pipe";
import { newest, toMemberDto, toProjectDto, toTeamDto } from "./mappers";
import { PrismaService } from "./prisma.service";

// Members, projects, the team row and categories: plain reads and writes, so the controllers call Prisma directly.

const jsonFields = <T extends Record<string, unknown>>(body: T, keys: (keyof T)[]) => {
  const out: Record<string, unknown> = { ...body };
  for (const k of keys) if (body[k] !== undefined) out[k as string] = JSON.stringify(body[k]);
  return out as { [K in keyof T]: K extends (typeof keys)[number] ? string : T[K] };
};

@Controller("members")
export class MembersController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async list() {
    return (await this.db.member.findMany({ orderBy: { name: "asc" } })).map(toMemberDto);
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<MemberDetailDto> {
    const m = await this.db.member.findUniqueOrThrow({
      where: { id },
      include: { assignments: { where: { hackathon: { stage: { in: ["submitted", "results"] } } }, include: { hackathon: true } } },
    });
    const { assignments, ...member } = m;
    return {
      ...toMemberDto(member),
      history: assignments
        .sort((a, b) => newest(b.hackathon) - newest(a.hackathon))
        .map(({ hackathon: h, role, accountable }) => ({
          hackathon: { id: h.id, title: h.title, stage: h.stage as Stage, endsAt: h.endsAt?.toISOString() ?? null },
          role: role as Role,
          accountable,
          result: h.result as HackathonResult | null,
        })),
    };
  }

  @Post()
  async create(@Body(new ZodPipe(MemberInput)) body: MemberInput) {
    return toMemberDto(await this.db.member.create({ data: jsonFields(body, ["skills", "preferredRoles"]) }));
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body(new ZodPipe(MemberPatch)) body: z.infer<typeof MemberPatch>) {
    return toMemberDto(await this.db.member.update({ where: { id }, data: jsonFields(body, ["skills", "preferredRoles"]) }));
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string) {
    await this.db.member.delete({ where: { id } });
  }
}

@Controller("projects")
export class ProjectsController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async list(): Promise<ProjectSummaryDto[]> {
    const rows = await this.db.project.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { hackathons: true } } } });
    return rows.map(({ _count, ...p }) => ({ ...toProjectDto(p), entries: _count.hackathons }));
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<ProjectDetailDto> {
    const { hackathons, ...p } = await this.db.project.findUniqueOrThrow({ where: { id }, include: { hackathons: true } });
    return {
      ...toProjectDto(p),
      hackathons: hackathons
        .sort((a, b) => newest(b) - newest(a))
        .map((h) => ({ id: h.id, title: h.title, stage: h.stage as Stage, result: h.result as HackathonResult | null, endsAt: h.endsAt?.toISOString() ?? null })),
    };
  }

  @Post()
  async create(@Body(new ZodPipe(ProjectInput)) body: ProjectInput) {
    return toProjectDto(await this.db.project.create({ data: jsonFields(body, ["tech"]) }));
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body(new ZodPipe(ProjectPatch)) body: z.infer<typeof ProjectPatch>) {
    return toProjectDto(await this.db.project.update({ where: { id }, data: jsonFields(body, ["tech"]) }));
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string) {
    await this.db.project.delete({ where: { id } });
  }
}

@Controller()
export class TeamController {
  constructor(private readonly db: PrismaService) {}

  @Get("team")
  async get() {
    const team = await this.db.team.findUnique({ where: { id: "team" } });
    return team ? toTeamDto(team) : null;
  }

  @Get("team/workload")
  async workload(): Promise<TeamWorkloadDto> {
    const [members, rows] = await Promise.all([
      this.db.member.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      this.db.hackathon.findMany({
        where: { stage: { in: [...ACTIVE_STAGES] } },
        include: { assignments: true, tasks: { select: { hackathonId: true, assigneeId: true, status: true } } },
      }),
    ]);
    // Undated last; MAX_SAFE_INTEGER rather than Infinity so two undated rows compare as 0, not NaN.
    const when = (h: (typeof rows)[number]) => (h.startsAt ?? h.submissionDueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    rows.sort((a, b) => when(a) - when(b));
    return {
      hackathons: rows.map((h) => ({
        id: h.id, title: h.title, stage: h.stage as Stage,
        startsAt: h.startsAt?.toISOString() ?? null, endsAt: h.endsAt?.toISOString() ?? null, submissionDueAt: h.submissionDueAt?.toISOString() ?? null,
      })),
      members: workload(members, rows.map((h) => ({ ...h, assignments: h.assignments.map((a) => ({ ...a, role: a.role as Role })) })), rows.flatMap((h) => h.tasks)),
    };
  }

  @Put("team")
  async put(@Body(new ZodPipe(TeamInput)) body: TeamInput) {
    const data = jsonFields(body, ["preferredTech", "preferredCats"]);
    return toTeamDto(await this.db.team.upsert({ where: { id: "team" }, create: data, update: data }));
  }

  /**
   * The bookmarklet reads this from third-party registration pages, so it is the one route open to any origin.
   * The token is one member's own secret (POST /auth/fill-token), and it returns that member's sign-up fields only:
   * the page sees them anyway once they're filled.
   */
  @Get("signup-profile")
  async signupProfile(@Query("token") token: unknown, @Res({ passthrough: true }) res: Response): Promise<SignupProfileDto> {
    res.setHeader("Access-Control-Allow-Origin", "*"); // set before any throw, so fill.js can read the 404 too
    const memberId = await fillTokenOwner(this.db, token);
    const [team, owner] = await Promise.all([
      this.db.team.findUnique({ where: { id: "team" }, select: { name: true, pitch: true } }),
      memberId
        ? this.db.member.findUnique({
            where: { id: memberId },
            select: { name: true, email: true, githubUrl: true, linkedinUrl: true, organisation: true, tshirtSize: true, dietary: true },
          })
        : null,
    ]);
    if (!owner) throw new NotFoundException("This bookmarklet is out of date. Drag the new one from HackOps Settings.");
    if (!team) throw new NotFoundException("Fill in the team profile in HackOps Settings first.");
    return { team, member: owner };
  }

  @Get("categories")
  async categories() {
    const rows = await this.db.category.findMany({ orderBy: { name: "asc" } });
    return rows.map((c) => ({ slug: c.slug, name: c.name }));
  }
}
