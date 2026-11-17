import { Controller, HttpCode, Post } from "@nestjs/common";
import { DiscoveryService } from "./refresh";

@Controller("discovery")
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  /** Fetches every source now; returns per-source counts. */
  @Post("refresh")
  @HttpCode(200)
  refresh() {
    return this.discovery.refresh();
  }
}
