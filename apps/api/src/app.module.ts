import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaErrorsFilter } from "./common/prisma-errors.filter";
import { DeadlinesController } from "./deadlines.controller";
import { DiscoveryController } from "./discovery/discovery.controller";
import { DiscoveryService } from "./discovery/refresh";
import { HackathonsController } from "./hackathons.controller";
import { HealthController } from "./health.controller";
import { PortfolioController } from "./portfolio.controller";
import { PrismaService } from "./prisma.service";
import { MembersController, ProjectsController, TeamController } from "./team.controller";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [HealthController, HackathonsController, MembersController, ProjectsController, TeamController, DiscoveryController, PortfolioController, DeadlinesController],
  providers: [PrismaService, DiscoveryService, { provide: APP_FILTER, useClass: PrismaErrorsFilter }],
})
export class AppModule {}
