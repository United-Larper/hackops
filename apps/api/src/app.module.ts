import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthMiddleware } from "./auth";
import { AuthController } from "./auth.controller";
import { PrismaErrorsFilter } from "./common/prisma-errors.filter";
import { DeadlinesController } from "./deadlines.controller";
import { DiscoveryController } from "./discovery/discovery.controller";
import { DiscoveryService } from "./discovery/refresh";
import { HackathonsController } from "./hackathons.controller";
import { HealthController } from "./health.controller";
import { SubmissionCheckService } from "./intel/submission-check";
import { PortfolioController } from "./portfolio.controller";
import { PrismaService } from "./prisma.service";
import { MembersController, ProjectsController, TeamController } from "./team.controller";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AuthController, HealthController, HackathonsController, MembersController, ProjectsController, TeamController, DiscoveryController, PortfolioController, DeadlinesController],
  providers: [PrismaService, DiscoveryService, SubmissionCheckService, { provide: APP_FILTER, useClass: PrismaErrorsFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("{*path}");
  }
}
