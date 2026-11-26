import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { HackathonInput, categorise, isSameEvent, type ScrapedHackathon } from "@hackops/shared";
import { PrismaService } from "../prisma.service";
import { fetchDevpost } from "./devpost";
import { fetchMlh } from "./mlh";
import { fetchMyList } from "./my-list";

export type Fetchers = Record<string, () => Promise<ScrapedHackathon[]>>;
export const DEFAULT_FETCHERS: Fetchers = { devpost: fetchDevpost, mlh: () => fetchMlh(), "my-list": () => fetchMyList() };

export type SourceReport = { fetched: number; added: number; updated: number; duplicates: number; invalid: number; error?: string };

const SOURCE_NAME: Record<string, string> = { devpost: "Devpost", mlh: "MLH", "my-list": "the Malaysian list" };
const parseList = (s: string): string[] => {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
};

@Injectable()
export class DiscoveryService {
  private readonly log = new Logger("Discovery");
  private running: Promise<Record<string, SourceReport>> | null = null;

  constructor(private readonly db: PrismaService) {}

  @Cron("0 8 * * *", { name: "discovery", timeZone: "Asia/Kuala_Lumpur" })
  async daily() {
    const report = await this.refresh();
    this.log.log(`Daily refresh: ${JSON.stringify(report)}`);
  }

  /** Runs every source one after another; a failing source is reported and skipped. Concurrent calls share one run. */
  refresh(fetchers: Fetchers = DEFAULT_FETCHERS) {
    this.running ??= this.run(fetchers).finally(() => (this.running = null));
    return this.running;
  }

  private async run(fetchers: Fetchers) {
    const report: Record<string, SourceReport> = {};
    const categories = (await this.db.category.findMany()).map((c) => ({ slug: c.slug, keywords: parseList(c.keywords) }));

    for (const [source, fetch] of Object.entries(fetchers)) {
      const r: SourceReport = { fetched: 0, added: 0, updated: 0, duplicates: 0, invalid: 0 };
      report[source] = r;
      let items: ScrapedHackathon[];
      try {
        items = await fetch();
      } catch (e) {
        r.error = e instanceof Error ? e.message : String(e);
        this.log.warn(`${source} failed: ${r.error}`);
        continue;
      }
      r.fetched = items.length;
      const known = await this.db.hackathon.findMany({ select: { id: true, source: true, sourceId: true, title: true, startsAt: true } });

      for (const item of items) {
        const { themes, ...rest } = item;
        // Scraped data is untrusted: it goes through the same schema as a hand-made entry.
        const parsed = HackathonInput.safeParse({ ...rest, categories: [] });
        if (!parsed.success) {
          r.invalid++;
          continue;
        }
        const { categories: _ignored, prizeTracks, ...fields } = parsed.data;
        const data = { ...fields, prizeTracks: JSON.stringify(prizeTracks) };

        const same = known.find((k) => k.source === item.source && k.sourceId === item.sourceId);
        if (same) {
          // Facts from the source are refreshed; stage, categories, prize tracks (imported or typed, with the team's
          // "entering" marks) and the team's notes are never touched.
          await this.db.hackathon.update({ where: { id: same.id }, data: fields });
          r.updated++;
          continue;
        }
        if (known.some((k) => isSameEvent(k, item))) {
          r.duplicates++;
          continue;
        }
        const slugs = categorise([item.title, item.organizer ?? "", ...themes].join(" "), categories);
        const created = await this.db.$transaction(async (tx) => {
          const h = await tx.hackathon.create({ data: { ...data, categories: { connect: slugs.map((slug) => ({ slug })) } } });
          await tx.activity.create({ data: { hackathonId: h.id, kind: "change", text: `Found on ${SOURCE_NAME[item.source] ?? item.source}` } });
          return h;
        });
        known.push({ id: created.id, source: created.source, sourceId: created.sourceId, title: created.title, startsAt: created.startsAt });
        r.added++;
      }
    }
    return report;
  }
}
