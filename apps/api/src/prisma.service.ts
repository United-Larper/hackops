import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { pgAdapter } from "./db";
import { PrismaClient } from "./generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: pgAdapter() });
  }

  onModuleDestroy() {
    return this.$disconnect();
  }
}
