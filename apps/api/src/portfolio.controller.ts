import { Controller, Get, Query } from "@nestjs/common";
import { PortfolioQuery, ROLES, type HackathonResult, type Mode, type PortfolioDto, type PortfolioEntryDto, type Role } from "@hackops/shared";
import { list, newest } from "./mappers";
import { PrismaService } from "./prisma.service";
import { ZodPipe } from "./common/zod.pipe";

/**
 * The public portfolio. Every field is picked by hand, never spread from a row, so contact details,
 * sign-up fields and internal notes (decision, retro, result note) can't leak in when the schema grows.
 */
@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async get(@Query(new ZodPipe(PortfolioQuery)) q: PortfolioQuery): Promise<PortfolioDto> {
    const [team, rows] = await Promise.all([
      this.db.team.findUnique({ where: { id: "team" }, select: { name: true, pitch: true } }),
      this.db.hackathon.findMany({
        where: { stage: { in: ["submitted", "results"] } },
        include: { categories: true, project: true, assignments: { include: { member: { select: { id: true, name: true } } } } },
      }),
    ]);
    rows.sort((a, b) => newest(b) - newest(a));

    const entries = rows.map((h): PortfolioEntryDto => {
      const p = h.project;
      const project = p
        ? { name: p.name, description: p.description, tech: list(p.tech), repoUrl: p.repoUrl, demoUrl: p.demoUrl, videoUrl: p.videoUrl, slidesUrl: p.slidesUrl, devpostUrl: p.devpostUrl }
        : null;
      return {
        id: h.id,
        title: h.title,
        url: h.url,
        organizer: h.organizer,
        mode: h.mode as Mode,
        city: h.city,
        country: h.country,
        endsAt: h.endsAt?.toISOString() ?? null,
        stage: h.stage as PortfolioEntryDto["stage"],
        result: h.result as HackathonResult | null,
        categories: h.categories.map((c) => ({ slug: c.slug, name: c.name })),
        project,
        team: h.assignments
          .map((a) => ({ id: a.member.id, name: a.member.name, role: a.role as Role }))
          .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name)),
        sample: h.source === "demo",
      };
    });

    // Filter options come from every entry, so picking one filter never hides the others' choices.
    const uniq = <T,>(list: T[], key: (t: T) => string) => [...new Map(list.map((t) => [key(t), t])).values()];
    const members = uniq(entries.flatMap((e) => e.team.map(({ id, name }) => ({ id, name }))), (m) => m.id).sort((a, b) => a.name.localeCompare(b.name));
    const categories = uniq(entries.flatMap((e) => e.categories), (c) => c.slug).sort((a, b) => a.name.localeCompare(b.name));

    return {
      team,
      entries: entries.filter(
        (e) => (!q.category || e.categories.some((c) => c.slug === q.category)) && (!q.member || e.team.some((m) => m.id === q.member)),
      ),
      members,
      categories,
    };
  }
}
