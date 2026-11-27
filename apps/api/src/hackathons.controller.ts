import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, ServiceUnavailableException } from "@nestjs/common";
import {
  BOARD_STAGES,
  BoardQuery,
  type BoardDto,
  HackathonPatch,
  HackathonQuery,
  NoteInput,
  PrizeTrackSchema,
  type PrizeTrack,
  type SubmissionCheckDto,
  type WinnersDto,
  StageInput,
  TaskInput,
  TaskPatch,
  TeamAssignmentsInput,
  nextDeadline,
  progressOf,
  type Region,
} from "@hackops/shared";
import { ZodPipe } from "./common/zod.pipe";
import type { Prisma } from "./generated/prisma/client";
import { HACKATHON_INCLUDE, WORKSPACE_INCLUDE, fitTeam, toHackathonDto, toTaskDto, toWorkspaceDto, tracksOf } from "./mappers";
import { PrismaService } from "./prisma.service";
import { changeStage, logActivity } from "./stage";
import { cachedWinners, fetchDevpostTracks, pastWinners } from "./intel/past-winners";
import { SubmissionCheckService } from "./intel/submission-check";

const LABELS: Record<string, string> = {
  title: "title", url: "link", organizer: "organizer", mode: "format", city: "city", country: "country",
  startsAt: "start date", endsAt: "end date", registrationClosesAt: "registration deadline",
  submissionDueAt: "submission deadline", judgingAt: "judging date", prizeAmount: "prize", prizeCurrency: "prize currency",
  teamSizeMax: "team size", eligibility: "eligibility", prizeTracks: "prize tracks", categories: "categories",
  projectId: "linked project", decisionNote: "decision note", resultNote: "result note",
  retroWentWell: "retro", retroToChange: "retro",
};

function regionWhere(region?: Region): Prisma.HackathonWhereInput {
  if (region === "online") return { mode: "online" };
  if (region === "malaysia") return { mode: { not: "online" }, country: "Malaysia" };
  if (region === "overseas") return { mode: { not: "online" }, OR: [{ country: null }, { country: { not: "Malaysia" } }] };
  return {};
}

/** Where a hackathon came from is fixed once it's stored. */
function writeData(body: HackathonPatch) {
  const { source, sourceId, ...rest } = body;
  return rest;
}

@Controller("hackathons")
export class HackathonsController {
  constructor(
    private readonly db: PrismaService,
    private readonly checks: SubmissionCheckService,
  ) {}

  @Get()
  async list(@Query(new ZodPipe(HackathonQuery)) q: HackathonQuery) {
    const where: Prisma.HackathonWhereInput = {
      ...(q.stage && { stage: q.stage }),
      ...(q.category && { categories: { has: q.category } }),
      ...(q.q && { title: { contains: q.q, mode: "insensitive" } }), // as on SQLite: Postgres compares case by default
      ...regionWhere(q.region),
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

  @Get("board")
  async board(@Query(new ZodPipe(BoardQuery)) q: BoardQuery): Promise<BoardDto> {
    const stages = q.skipped ? [...BOARD_STAGES, "skipped" as const] : BOARD_STAGES;
    const where: Prisma.HackathonWhereInput = {
      stage: { in: [...stages] },
      ...(q.category && { categories: { has: q.category } }),
      ...(q.owner && { assignments: { some: { memberId: q.owner, accountable: true } } }),
      ...regionWhere(q.region),
      // Region and mode both constrain mode, so they combine with AND.
      ...(q.mode && { AND: [{ mode: { in: [q.mode, "hybrid"] } }] }),
    };
    const [rows, team] = await Promise.all([
      this.db.hackathon.findMany({
        where,
        include: { ...HACKATHON_INCLUDE, tasks: { select: { status: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      fitTeam(this.db),
    ]);
    const now = new Date();
    const week = now.getTime() + 7 * 86_400_000;
    const board = Object.fromEntries(stages.map((s) => [s, []])) as unknown as BoardDto;
    for (const { tasks, ...h } of rows) {
      const card = { ...toHackathonDto(h, team, now), progress: progressOf(tasks), nextDeadline: nextDeadline({ ...h, stage: h.stage as never }, now) };
      if (q.week && (!card.nextDeadline || new Date(card.nextDeadline.at).getTime() > week)) continue;
      board[card.stage as keyof BoardDto]!.push(card);
    }
    return board;
  }

  /** Past-winner briefs already fetched, by organizer. Discover reads this; it never starts a fetch. */
  @Get("winners")
  winnersCached(): Record<string, WinnersDto["brief"]> {
    return cachedWinners();
  }

  /** "What wins here": past Devpost editions by the same organizer. The first call per organizer fetches (up to a minute). */
  @Get(":id/winners")
  async winners(@Param("id") id: string): Promise<WinnersDto> {
    const h = await this.db.hackathon.findUniqueOrThrow({ where: { id }, select: { source: true, organizer: true } });
    if (h.source !== "devpost" || !h.organizer) return { organizer: h.organizer, brief: null };
    try {
      return { organizer: h.organizer, brief: await pastWinners(h.organizer) };
    } catch (e) {
      throw new ServiceUnavailableException(`Devpost didn't answer: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Adds the event's Devpost prize tracks. Tracks already there (same name) keep their text and "entering" mark. */
  @Post(":id/tracks/import")
  @HttpCode(200)
  async importTracks(@Param("id") id: string) {
    const h = await this.db.hackathon.findUniqueOrThrow({ where: { id }, select: { source: true, url: true, prizeTracks: true } });
    if (h.source !== "devpost") throw new BadRequestException("Only Devpost events list prize tracks to import; add them by hand.");
    let scraped: Awaited<ReturnType<typeof fetchDevpostTracks>>;
    try {
      scraped = await fetchDevpostTracks(h.url);
    } catch (e) {
      throw new ServiceUnavailableException(`Devpost didn't answer: ${e instanceof Error ? e.message : e}`);
    }
    const current = tracksOf(h.prizeTracks);
    const known = new Set(current.map((t) => t.name.toLowerCase()));
    // Scraped text is untrusted: each track goes through the same schema as a typed one.
    const added = scraped
      .map((t) => PrizeTrackSchema.safeParse(t))
      .flatMap((r) => (r.success && !known.has(r.data.name.toLowerCase()) ? [r.data] : []));
    const tracks: PrizeTrack[] = [...current, ...added].slice(0, 50);
    await this.db.$transaction(async (tx) => {
      await tx.hackathon.update({ where: { id }, data: { prizeTracks: tracks } });
      await logActivity(tx, id, added.length ? `Imported ${added.length} prize track${added.length === 1 ? "" : "s"} from Devpost` : "Checked Devpost: no new prize tracks");
    });
    return this.get(id);
  }

  /** The pre-submission check, run now. */
  @Get(":id/check")
  check(@Param("id") id: string): Promise<SubmissionCheckDto> {
    return this.checks.run(id);
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
      const order = await tx.task.count({ where: { hackathonId: id } }); // new tasks go last; only the template sets order otherwise
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
      await logActivity(tx, id, body.text, "note");
    });
    return this.get(id);
  }
}
