import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from "@nestjs/common";
import {
  ACTIVE_STAGES, MemberInput, MemberPatch, ProjectInput, ProjectPatch, TeamInput, workload,
  type HackathonResult, type MemberDetailDto, type Role, type Stage, type TeamWorkloadDto,
} from "@hackops/shared";
import { z } from "zod";
import { ZodPipe } from "./common/zod.pipe";
import { toMemberDto, toProjectDto, toTeamDto } from "./mappers";
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
    const when = (h: { endsAt: Date | null; submissionDueAt: Date | null; updatedAt: Date }) => (h.endsAt ?? h.submissionDueAt ?? h.updatedAt).getTime();
    const { assignments, ...member } = m;
    return {
      ...toMemberDto(member),
      history: assignments
        .sort((a, b) => when(b.hackathon) - when(a.hackathon))
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
  async list() {
    return (await this.db.project.findMany({ orderBy: { name: "asc" } })).map(toProjectDto);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return toProjectDto(await this.db.project.findUniqueOrThrow({ where: { id } }));
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
    const when = (h: (typeof rows)[number]) => (h.startsAt ?? h.submissionDueAt)?.getTime() ?? Infinity;
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

  @Get("categories")
  async categories() {
    const rows = await this.db.category.findMany({ orderBy: { name: "asc" } });
    return rows.map((c) => ({ slug: c.slug, name: c.name }));
  }
}
