import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { PrismaErrorsFilter } from "./common/prisma-errors.filter";
import { HackathonsController } from "./hackathons.controller";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { MembersController, ProjectsController, TeamController } from "./team.controller";

@Module({
  controllers: [HealthController, HackathonsController, MembersController, ProjectsController, TeamController],
  providers: [PrismaService, { provide: APP_FILTER, useClass: PrismaErrorsFilter }],
})
export class AppModule {}
