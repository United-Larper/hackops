import { Controller, Get, Header, Query } from "@nestjs/common";
import { ACTIVE_STAGES, BOARD_STAGES, DeadlinesQuery, dueItems, toIcs, upcomingDeadlines, type GroupedDueItem } from "@hackops/shared";
import { ZodPipe } from "./common/zod.pipe";
import { SubmissionCheckService } from "./intel/submission-check";
import { PrismaService } from "./prisma.service";

@Controller()
export class DeadlinesController {
  constructor(
    private readonly db: PrismaService,
    private readonly checks: SubmissionCheckService,
  ) {}

  /** The due-soon panel: in-scope deadlines, open tasks and failing pre-submission checks in the next `days` days, grouped by MYT day. */
  @Get("deadlines")
  async list(@Query(new ZodPipe(DeadlinesQuery)) q: DeadlinesQuery): Promise<GroupedDueItem[]> {
    const [hackathons, tasks] = await this.load();
    return upcomingDeadlines(hackathons, tasks, new Date(), q.days, this.checks.failures());
  }

  /** The calendar feed: the same deadlines at any date, for Google Calendar, Outlook or Apple Calendar to import or subscribe to. */
  @Get("calendar.ics")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  async calendar(): Promise<string> {
    const [hackathons, tasks] = await this.load();
    return toIcs(dueItems(hackathons, tasks), new Date());
  }

  private load() {
    return Promise.all([
      this.db.hackathon.findMany({
        where: { stage: { in: [...BOARD_STAGES] } },
        select: { id: true, title: true, stage: true, registrationClosesAt: true, submissionDueAt: true, judgingAt: true },
      }),
      this.db.task.findMany({
        where: { status: { not: "done" }, dueAt: { not: null }, hackathon: { stage: { in: [...ACTIVE_STAGES] } } },
        select: { id: true, title: true, status: true, dueAt: true, hackathonId: true },
      }),
    ]);
  }
}
