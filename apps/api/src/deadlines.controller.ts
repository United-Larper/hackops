import { Controller, Get, Query } from "@nestjs/common";
import { ACTIVE_STAGES, BOARD_STAGES, DeadlinesQuery, upcomingDeadlines, type GroupedDueItem } from "@hackops/shared";
import { ZodPipe } from "./common/zod.pipe";
import { PrismaService } from "./prisma.service";

@Controller("deadlines")
export class DeadlinesController {
  constructor(private readonly db: PrismaService) {}

  /** The due-soon panel: in-scope deadlines and open tasks in the next `days` days, grouped by MYT day. */
  @Get()
  async list(@Query(new ZodPipe(DeadlinesQuery)) q: DeadlinesQuery): Promise<GroupedDueItem[]> {
    const [hackathons, tasks] = await Promise.all([
      this.db.hackathon.findMany({
        where: { stage: { in: [...BOARD_STAGES] } },
        select: { id: true, title: true, stage: true, registrationClosesAt: true, submissionDueAt: true, judgingAt: true },
      }),
      this.db.task.findMany({
        where: { status: { not: "done" }, dueAt: { not: null }, hackathon: { stage: { in: [...ACTIVE_STAGES] } } },
        select: { id: true, title: true, status: true, dueAt: true, hackathonId: true },
      }),
    ]);
    return upcomingDeadlines(hackathons, tasks, new Date(), q.days);
  }
}
