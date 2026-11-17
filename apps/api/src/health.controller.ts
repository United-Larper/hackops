import { Controller, Get } from "@nestjs/common";
import { phaseOf } from "@hackops/shared";
import { PrismaService } from "./prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async health() {
    await this.db.$queryRaw`SELECT 1`;
    // phaseOf proves the shared package resolves from the API.
    return { ok: true, db: "up", shared: phaseOf("building") };
  }
}
