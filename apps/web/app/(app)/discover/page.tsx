import type { Metadata } from "next";
import Link from "next/link";
import type { CategoryDto, HackathonDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { clockTime, countdown, isUrgent, shortDate } from "@/lib/time";
import { decide } from "./actions";
import { DecideButton, RefreshButton } from "./controls";

export const metadata: Metadata = { title: "Discover" };

type Search = { region?: string; category?: string; within?: string; all?: string };

const REGIONS = [
  { value: "", label: "Everywhere" },
  { value: "malaysia", label: "Malaysia" },
  { value: "online", label: "Online" },
  { value: "overseas", label: "Overseas" },
];
const SOURCE: Record<string, string> = { devpost: "Devpost", mlh: "MLH", "my-list": "Malaysian list", manual: "Added by hand", demo: "Demo data" };
const PAGE = 40;

const money = (amount: number, currency: string | null) => {
  try {
    return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString("en-MY")}`.trim();
  }
};

const qs = (s: Search, change: Partial<Search>) => {
  const p = new URLSearchParams(Object.entries({ ...s, ...change }).filter(([, v]) => v) as [string, string][]);
  const out = p.toString();
  return out ? `?${out}` : "";
};

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const query = new URLSearchParams({ stage: "discovered", open: "1", sort: "fit" });
  if (s.region) query.set("region", s.region);
  if (s.category) query.set("category", s.category);
  if (s.within) query.set("closesWithin", s.within);

  let rows: HackathonDto[] = [];
  let categories: CategoryDto[] = [];
  let error: string | null = null;
  try {
    [rows, categories] = await Promise.all([api<HackathonDto[]>(`/hackathons?${query}`), api<CategoryDto[]>("/categories")]);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Couldn't load hackathons.";
  }
  const shown = s.all ? rows : rows.slice(0, PAGE);
  const filtered = Boolean(s.region || s.category || s.within);
  const now = new Date();

  return (
    <>
      <PageHeader title="Discover" action={<RefreshButton />} />

      <form method="get" className="flex flex-wrap items-end gap-x-4 gap-y-3" aria-label="Filter hackathons">
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">Where</legend>
          {REGIONS.map((r) => {
            const on = (s.region ?? "") === r.value;
            return (
              <Link
                key={r.value}
                href={`/discover${qs(s, { region: r.value, all: "" })}`}
                aria-current={on ? "true" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  on ? "border-line-strong bg-text text-ground" : "border-line bg-panel hover:border-line-strong"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </fieldset>
        <input type="hidden" name="region" value={s.region ?? ""} />
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Category
          <select name="category" defaultValue={s.category ?? ""} className="min-h-9 rounded-md border border-line bg-panel px-2.5 text-sm text-text">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Next deadline
          <select name="within" defaultValue={s.within ?? ""} className="min-h-9 rounded-md border border-line bg-panel px-2.5 text-sm text-text">
            <option value="">Any time</option>
            <option value="7">Within 7 days</option>
            <option value="30">Within 30 days</option>
          </select>
        </label>
        <button className="min-h-9 rounded-md border border-line bg-panel px-3.5 text-sm font-semibold hover:bg-panel-2">Apply</button>
        {filtered && (
          <Link href="/discover" className="min-h-9 py-2 text-sm text-muted underline hover:text-text">
            Clear filters
          </Link>
        )}
      </form>

      {error ? (
        <EmptyState title="Can't reach the API">{error}</EmptyState>
      ) : rows.length === 0 ? (
        filtered ? (
          <EmptyState title="Nothing matches these filters">
            Try another region or category, or <Link href="/discover" className="underline">clear the filters</Link>.
          </EmptyState>
        ) : (
          <EmptyState title="No hackathons found yet">
            Press <strong>Refresh now</strong> to check Devpost, MLH and the Malaysian list, or wait for the daily check at 08:00 MYT.
          </EmptyState>
        )
      ) : (
        <section aria-labelledby="results-h">
          <h2 id="results-h" className="mb-2 text-sm text-muted">
            {rows.length} open hackathon{rows.length === 1 ? "" : "s"}, best fit first
          </h2>
          <ol className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-panel">
            {shown.map((h) => (
              <Row key={h.id} h={h} now={now} />
            ))}
          </ol>
          {!s.all && rows.length > PAGE && (
            <Link href={`/discover${qs(s, { all: "1" })}`} className="mt-3 inline-block text-sm font-semibold underline">
              Show all {rows.length}
            </Link>
          )}
        </section>
      )}
    </>
  );
}

function Row({ h, now }: { h: HackathonDto; now: Date }) {
  const next = h.registrationClosesAt ?? h.submissionDueAt;
  const nextLabel = h.registrationClosesAt ? "Registration closes" : "Submission due";
  const urgent = next ? isUrgent(next, now) : false;
  const score = h.fit?.score ?? null;
  const place = h.mode === "online" ? "Online" : [h.city, h.country].filter(Boolean).join(", ") || "Place not listed";

  return (
    <li className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-4 gap-y-3 px-4 py-4 sm:px-5 lg:grid-cols-[56px_minmax(0,1fr)_150px_170px_auto] lg:items-center">
      <div
        className={`row-span-2 grid size-[52px] place-items-center rounded-md font-display leading-none lg:row-span-1 lg:size-14 ${
          score === null ? "bg-panel-2 text-muted" : score >= 60 ? "bg-gold text-on-gold" : "bg-panel-2 text-text"
        }`}
        aria-label={score === null ? "No fit score" : `Fit ${score} out of 100`}
      >
        <span className="text-[24px] font-extrabold">{score ?? "–"}</span>
        <span className="-mt-1.5 text-xs font-bold tracking-[0.08em]">FIT</span>
      </div>

      <div className="min-w-0">
        <a href={h.url} target="_blank" rel="noopener noreferrer" className="group inline-flex max-w-full items-baseline gap-1.5 text-[15px] font-semibold hover:underline">
          <span className="truncate">{h.title}</span>
          <Icon name="arrow-right" size={13} className="-rotate-45 self-center text-muted group-hover:text-text" label="Opens the event page" />
        </a>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {[h.organizer, place, SOURCE[h.source] ?? h.source].filter(Boolean).join(" · ")}
        </p>
        {h.fit && h.fit.reasons.length > 0 && <p className="mt-1 text-[13px]">{h.fit.reasons.join(" · ")}</p>}
        {h.categories.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Categories">
            {h.categories.map((c) => (
              <li key={c.slug} className="rounded-[3px] bg-panel-2 px-2 py-0.5 text-xs font-medium">
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="col-start-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 lg:contents">
        <p className="text-sm">
          <span className="block text-xs text-muted">Prize</span>
          <span className="font-display text-xl font-bold">{h.prizeAmount ? money(h.prizeAmount, h.prizeCurrency) : "Not listed"}</span>
        </p>
        <p className="text-sm">
          <span className="block text-xs text-muted">{next ? nextLabel : "Deadline"}</span>
          {next ? (
            <>
              <span className={`font-display text-xl font-bold ${urgent ? "text-live-text" : ""}`}>{countdown(next, now)}</span>{" "}
              <span className="text-[13px] text-muted">
                {shortDate(next)}, {clockTime(next)}
              </span>
            </>
          ) : (
            <span className="font-display text-xl font-bold">Not listed</span>
          )}
        </p>
      </div>

      <div className="col-start-2 flex gap-2 lg:col-start-auto lg:justify-end">
        <form action={decide}>
          <input type="hidden" name="id" value={h.id} />
          <input type="hidden" name="stage" value="interested" />
          <DecideButton primary>Interested</DecideButton>
        </form>
        <form action={decide}>
          <input type="hidden" name="id" value={h.id} />
          <input type="hidden" name="stage" value="skipped" />
          <DecideButton>Skip</DecideButton>
        </form>
      </div>
    </li>
  );
}
