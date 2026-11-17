import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import {
  HackathonInput,
  HackathonPatch,
  HackathonQuery,
  NoteInput,
  StageInput,
  TaskInput,
  TaskPatch,
  TeamAssignmentsInput,
} from "@hackops/shared";
import { ZodPipe } from "./common/zod.pipe";
import type { Prisma } from "./generated/prisma/client";
import { HACKATHON_INCLUDE, WORKSPACE_INCLUDE, fitTeam, toHackathonDto, toTaskDto, toWorkspaceDto } from "./mappers";
import { PrismaService } from "./prisma.service";
import { changeStage, logActivity } from "./stage";

const LABELS: Record<string, string> = {
  title: "title", url: "link", organizer: "organizer", mode: "format", city: "city", country: "country",
  startsAt: "start date", endsAt: "end date", registrationClosesAt: "registration deadline",
  submissionDueAt: "submission deadline", judgingAt: "judging date", prizeAmount: "prize", prizeCurrency: "prize currency",
  teamSizeMax: "team size", eligibility: "eligibility", prizeTracks: "prize tracks", categories: "categories",
  ownerId: "owner", projectId: "linked project", decisionNote: "decision note", resultNote: "result note",
  retroWentWell: "retro", retroToChange: "retro",
};

function writeData(body: HackathonPatch) {
  const { categories, prizeTracks, source, sourceId, ...rest } = body;
  return {
    ...rest,
    ...(prizeTracks !== undefined && { prizeTracks: JSON.stringify(prizeTracks) }),
    ...(categories !== undefined && { categories: { set: categories.map((slug) => ({ slug })) } }),
  };
}

@Controller("hackathons")
export class HackathonsController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async list(@Query(new ZodPipe(HackathonQuery)) q: HackathonQuery) {
    const where: Prisma.HackathonWhereInput = {
      ...(q.stage && { stage: q.stage }),
      ...(q.category && { categories: { some: { slug: q.category } } }),
      ...(q.q && { title: { contains: q.q } }),
      ...(q.region === "online" && { mode: "online" }),
      ...(q.region === "malaysia" && { mode: { not: "online" }, country: "Malaysia" }),
      ...(q.region === "overseas" && { mode: { not: "online" }, OR: [{ country: null }, { country: { not: "Malaysia" } }] }),
    };
    const [rows, team] = await Promise.all([
      this.db.hackathon.findMany({ where, include: HACKATHON_INCLUDE, orderBy: { createdAt: "desc" } }),
      fitTeam(this.db),
    ]);
    const now = new Date();
    const next = (h: { registrationClosesAt: Date | null; submissionDueAt: Date | null }) => h.registrationClosesAt ?? h.submissionDueAt;
    // ponytail: deadline filters and sorting run in memory; fine for hundreds of rows, move to SQL past that.
    const kept = rows.filter((h) => {
      const n = next(h);
      if (q.open && n && n <= now) return false;
      if (q.closesWithin && (!n || n <= now || n.getTime() - now.getTime() > q.closesWithin * 86_400_000)) return false;
      return true;
    });
    const dtos = kept.map((h) => toHackathonDto(h, team, now));
    if (q.sort === "fit") dtos.sort((a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0));
    if (q.sort === "deadline") {
      const t = (d: (typeof dtos)[number]) => new Date(d.registrationClosesAt ?? d.submissionDueAt ?? "9999-12-31").getTime();
      dtos.sort((a, b) => t(a) - t(b));
    }
    return dtos;
  }

  @Post()
  async create(@Body(new ZodPipe(HackathonInput)) body: HackathonInput) {
    const { categories, prizeTracks, ...rest } = body;
    const row = await this.db.$transaction(async (tx) => {
      const h = await tx.hackathon.create({
        data: { ...rest, prizeTracks: JSON.stringify(prizeTracks), categories: { connect: categories.map((slug) => ({ slug })) } },
        include: HACKATHON_INCLUDE,
      });
      await logActivity(tx, h.id, "Added by hand");
      return h;
    });
    return toHackathonDto(row);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const [row, team] = await Promise.all([this.db.hackathon.findUniqueOrThrow({ where: { id }, include: WORKSPACE_INCLUDE }), fitTeam(this.db)]);
    return toWorkspaceDto(row, team);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body(new ZodPipe(HackathonPatch)) body: HackathonPatch) {
    const changed = [...new Set(Object.keys(body).map((k) => LABELS[k]).filter(Boolean))];
    await this.db.$transaction(async (tx) => {
      await tx.hackathon.update({ where: { id }, data: writeData(body) });
      if (changed.length) await logActivity(tx, id, `Updated ${changed.join(", ")}`);
    });
    return this.get(id);
  }

  @Post(":id/stage")
  @HttpCode(200)
  async stage(@Param("id") id: string, @Body(new ZodPipe(StageInput)) body: StageInput) {
    await changeStage(this.db, id, body);
    return this.get(id);
  }

  @Post(":id/tasks")
  async addTask(@Param("id") id: string, @Body(new ZodPipe(TaskInput)) body: TaskInput) {
    return this.db.$transaction(async (tx) => {
      const order = body.order ?? (await tx.task.count({ where: { hackathonId: id } }));
      const task = await tx.task.create({ data: { ...body, order, hackathonId: id }, include: { assignee: true } });
      await logActivity(tx, id, `Task added: ${task.title}`);
      return toTaskDto(task);
    });
  }

  @Patch(":id/tasks/:taskId")
  async updateTask(@Param("id") id: string, @Param("taskId") taskId: string, @Body(new ZodPipe(TaskPatch)) body: TaskPatch) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.task.findUniqueOrThrow({ where: { id: taskId, hackathonId: id } });
      const task = await tx.task.update({ where: { id: taskId }, data: body, include: { assignee: true } });
      if (body.status && body.status !== before.status) await logActivity(tx, id, `Task "${task.title}" moved to ${body.status}`);
      else await logActivity(tx, id, `Task "${task.title}" updated`);
      return toTaskDto(task);
    });
  }

  @Delete(":id/tasks/:taskId")
  @HttpCode(204)
  async removeTask(@Param("id") id: string, @Param("taskId") taskId: string) {
    await this.db.$transaction(async (tx) => {
      const task = await tx.task.delete({ where: { id: taskId, hackathonId: id } });
      await logActivity(tx, id, `Task removed: ${task.title}`);
    });
  }

  @Put(":id/team")
  async setTeam(@Param("id") id: string, @Body(new ZodPipe(TeamAssignmentsInput)) body: TeamAssignmentsInput) {
    await this.db.$transaction(async (tx) => {
      await tx.hackathon.findUniqueOrThrow({ where: { id } });
      await tx.assignment.deleteMany({ where: { hackathonId: id } });
      await tx.assignment.createMany({ data: body.map((a) => ({ ...a, hackathonId: id })) });
      const members = await tx.member.findMany({ where: { id: { in: body.map((a) => a.memberId) } } });
      const name = (mid: string) => members.find((m) => m.id === mid)?.name ?? "Unknown";
      const summary = body.map((a) => `${name(a.memberId)} (${a.role}${a.accountable ? ", accountable" : ""})`).join(", ");
      await logActivity(tx, id, body.length ? `Team set: ${summary}` : "Team cleared");
    });
    return this.get(id);
  }

  @Post(":id/notes")
  async addNote(@Param("id") id: string, @Body(new ZodPipe(NoteInput)) body: NoteInput) {
    await this.db.$transaction(async (tx) => {
      await tx.hackathon.findUniqueOrThrow({ where: { id } });
      await logActivity(tx, id, body.text, "note", body.memberId);
    });
    return this.get(id);
  }
}
