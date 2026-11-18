import type { Metadata } from "next";
import Link from "next/link";
import { ROLES, type PortfolioDto, type PortfolioEntryDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { EmptyState as Empty } from "@/components/shell/page-header";
import { Wordmark } from "@/components/shell/rail";
import { ResultSquare } from "@/components/result";
import { api, ApiError } from "@/lib/api";
import { PROJECT_LINKS, ROLE_LABEL } from "@/lib/format";
import { MYT } from "@/lib/time";

// Public, read-only, outside the app shell. Filters live in the URL: ?member= is the link a member puts in a CV.
type Search = { member?: string; category?: string };
type Props = { searchParams: Promise<Search> };

const qs = (s: Search) => {
  const p = new URLSearchParams(Object.entries(s).filter(([, v]) => v) as [string, string][]).toString();
  return p ? `/portfolio?${p}` : "/portfolio";
};
const load = (s: Search) => api<PortfolioDto>(`/portfolio${qs(s).slice("/portfolio".length)}`);
const monthYear = new Intl.DateTimeFormat("en-MY", { month: "short", year: "numeric", timeZone: MYT });

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const s = await searchParams;
  const data = await load(s).catch(() => null);
  const team = data?.team?.name ?? "Hackathon portfolio";
  const member = data?.members.find((m) => m.id === s.member);
  const title = member ? `${member.name} · ${team}` : team;
  const description = member
    ? `Hackathon projects ${member.name} built with ${team}: their role on each team, the tech, and the results.`
    : data?.team?.pitch ?? `Every hackathon ${team} has entered: the projects, the tech, who built them and how it went.`;
  return { title: { absolute: `${title} · Portfolio` }, description, openGraph: { title, description, type: "profile" } };
}

export default async function PortfolioPage({ searchParams }: Props) {
  const s = await searchParams;
  let data: PortfolioDto | null = null;
  let error: string | null = null;
  try {
    data = await load(s);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "The portfolio couldn't load.";
  }
  const member = data?.members.find((m) => m.id === s.member);
  const team = data?.team?.name ?? "Our hackathon portfolio";
  const entries = data?.entries ?? [];
  const roles = member
    ? ROLES.filter((r) => entries.some((e) => e.team.some((t) => t.id === member.id && t.role === r)))
    : [];

  return (
    <div className="min-h-dvh bg-ground text-text">
      <header className="bg-rail text-rail-text">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5 sm:px-8 lg:px-14">
          <p className="flex items-center gap-3">
            <Wordmark size={24} />
            <span className="text-sm text-rail-muted">{team}</span>
          </p>
          {data && data.members.length > 0 && (
            <nav aria-label="Whose entries" className="-mx-2.5 flex flex-wrap gap-x-1 sm:ml-auto">
              <SwitchLink href={qs({ category: s.category })} active={!member}>All entries</SwitchLink>
              {data.members.map((m) => (
                <SwitchLink key={m.id} href={qs({ ...s, member: m.id })} active={member?.id === m.id}>{m.name}</SwitchLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-8 pb-16 sm:px-8 sm:pt-10 lg:px-14">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="font-display text-[44px] leading-[0.95] font-extrabold tracking-[-0.01em] text-balance sm:text-[64px]">{member?.name ?? team}</h1>
            <p className="mt-2 text-[15px] text-muted">
              {member
                ? [roles.map((r) => ROLE_LABEL[r]).join(", "), plural(entries.length, "entry", "entries")].filter(Boolean).join(" · ")
                : data?.team?.pitch ?? plural(entries.length, "entry", "entries")}
            </p>
          </div>
          {entries.some((e) => e.sample) && (
            <p className="flex items-center gap-2 text-[13px] text-muted sm:ml-auto sm:pb-1.5">
              <SampleTag /> Demo data, not real results
            </p>
          )}
        </div>

        {data && data.categories.length > 1 && (
          <nav aria-label="Category" className="flex flex-wrap gap-2">
            <Chip href={qs({ member: s.member })} active={!s.category}>All categories</Chip>
            {data.categories.map((c) => (
              <Chip key={c.slug} href={qs({ ...s, category: c.slug })} active={s.category === c.slug}>{c.name}</Chip>
            ))}
          </nav>
        )}

        {error ? (
          <Empty title="Portfolio unavailable">{error}</Empty>
        ) : entries.length === 0 ? (
          s.member || s.category ? (
            <Empty title="No entries match">
              Nothing here for this filter yet. <Link href="/portfolio" className="font-medium text-text underline underline-offset-2">See every entry</Link>.
            </Empty>
          ) : (
            <Empty title="Nothing to show yet">Every hackathon the team submits to becomes an entry here, with the project, the tech, who built it and the result.</Empty>
          )
        ) : (
          <ol className="flex flex-col gap-4 sm:gap-5">
            {entries.map((e) => <Entry key={e.id} e={e} highlight={member?.id} filters={s} />)}
          </ol>
        )}
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-[1280px] px-4 py-6 text-[13px] text-muted sm:px-8 lg:px-14">
          {team} · newest first · kept with <span className="font-display font-bold tracking-[0.02em] text-text">HACKOPS</span>
        </p>
      </footer>
    </div>
  );
}

/** One entry: the project leads, the event's team sheet sits beside it, the linked member lit gold. */
function Entry({ e, highlight, filters }: { e: PortfolioEntryDto; highlight?: string; filters: Search }) {
  const p = e.project;
  const links = p ? PROJECT_LINKS.filter((l) => p[l.key]) : [];
  const where = e.mode === "online" ? "Online" : [...new Set([e.city, e.country].filter(Boolean))].join(", ");
  const standout = e.result === "won" || e.result === "finalist";
  return (
    <li className="grid overflow-hidden rounded-[10px] border border-line bg-panel md:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      <article className="flex min-w-0 flex-col px-5 py-5 sm:px-7 sm:py-6">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted">
          <ResultSquare result={e.result} />
          {standout && (
            <span className="font-display text-[15px] font-bold tracking-[0.05em] text-text uppercase">{e.result === "won" ? "Won" : "Finalist"}</span>
          )}
          {!e.result && <span>Awaiting result</span>}
          <span aria-hidden>·</span>
          <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-medium text-text underline-offset-2 hover:underline">{e.title}</a>
          {e.endsAt && <span>{monthYear.format(new Date(e.endsAt))}</span>}
          {where && <span>{where}</span>}
          {e.sample && <SampleTag />}
        </p>

        <h2 className="mt-3 font-display text-[36px] leading-none font-extrabold tracking-[-0.01em] text-balance sm:text-[52px]">
          {p?.name ?? <span className="text-muted">Project not linked yet</span>}
        </h2>
        {p?.description && <p className="mt-2.5 max-w-[62ch] text-[15px] leading-relaxed sm:text-base">{p.description}</p>}

        {p && p.tech.length > 0 && (
          <ul aria-label="Tech" className="mt-4 flex flex-wrap gap-1.5">
            {p.tech.map((t) => <li key={t} className="rounded-[3px] bg-panel-2 px-2 py-0.5 text-xs font-medium">{t}</li>)}
          </ul>
        )}
        {links.length > 0 && (
          <ul aria-label="Links" className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-5">
            {links.map((l) => (
              <li key={l.key}>
                <a href={p![l.key]!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold underline underline-offset-4 hover:no-underline">
                  {l.label} <Icon name="arrow-right" size={13} className="-rotate-45" />
                </a>
              </li>
            ))}
          </ul>
        )}
        {e.categories.length > 0 && <p className="mt-3 text-xs text-muted">{e.categories.map((c) => c.name).join(" · ")}</p>}
      </article>

      <section aria-label={`Team for ${e.title}`} className="bg-rail px-5 py-5 text-rail-text sm:px-6">
        <h3 className="font-display text-[15px] font-bold tracking-[0.06em] text-gold uppercase">Team sheet</h3>
        {e.team.length === 0 ? (
          <p className="mt-3 text-sm text-rail-muted">No line-up recorded.</p>
        ) : (
          <ul className="mt-2">
            {e.team.map((t) => {
              const me = t.id === highlight;
              return (
                <li key={t.id} className="border-b border-rail-line last:border-0">
                  <Link
                    href={qs({ ...filters, member: t.id })}
                    aria-current={me ? "true" : undefined}
                    className={`flex min-h-11 items-center justify-between gap-4 py-2 transition-colors hover:text-rail-strong ${me ? "text-gold" : ""}`}
                  >
                    <span className="font-display text-[17px] font-bold tracking-[0.05em] uppercase">{ROLE_LABEL[t.role]}</span>
                    <span className={`truncate text-[15px] ${me ? "font-semibold" : ""}`}>{t.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </li>
  );
}

function SwitchLink({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${active ? "font-semibold text-gold" : "text-rail-text hover:bg-rail-2 hover:text-rail-strong"}`}
    >
      {children}
    </Link>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${
        active ? "border-line-strong bg-text text-ground" : "border-line bg-panel hover:border-line-strong"
      }`}
    >
      {children}
    </Link>
  );
}

function SampleTag() {
  return <span className="rounded-[3px] border border-dashed border-line-strong px-1.5 py-px text-xs font-semibold text-muted">Sample entry</span>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
