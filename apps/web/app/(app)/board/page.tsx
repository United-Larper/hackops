import { unstable_rethrow } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { BoardDto, CategoryDto, MemberDto } from "@hackops/shared";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { Board } from "./board";

export const metadata: Metadata = { title: "Board" };

// Filters live in the URL so a filtered board can be shared.
type Search = { category?: string; owner?: string; region?: string; mode?: string; week?: string; skipped?: string };
const KEYS = ["category", "owner", "region", "mode", "week", "skipped"] as const;

const qs = (s: Search, change: Partial<Search> = {}) => {
  const p = new URLSearchParams(Object.entries({ ...s, ...change }).filter(([k, v]) => v && (KEYS as readonly string[]).includes(k)) as [string, string][]);
  const out = p.toString();
  return out ? `?${out}` : "";
};

const select = "min-h-9 rounded-md border border-line bg-panel px-2.5 text-sm text-text";

function Toggle({ s, name, children }: { s: Search; name: "week" | "skipped"; children: string }) {
  const on = s[name] === "1";
  return (
    <Link
      href={`/board${qs(s, { [name]: on ? "" : "1" })}`}
      aria-pressed={on}
      className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${
        on ? "border-line-strong bg-text text-ground" : "border-line bg-panel hover:border-line-strong"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function BoardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  let board: BoardDto | null = null;
  let categories: CategoryDto[] = [];
  let members: MemberDto[] = [];
  let error: string | null = null;
  try {
    [board, categories, members] = await Promise.all([
      api<BoardDto>(`/hackathons/board${qs(s)}`),
      api<CategoryDto[]>("/categories"),
      api<MemberDto[]>("/members"),
    ]);
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
    error = e instanceof ApiError ? e.message : "Couldn't load the board.";
  }
  const filtered = Boolean(s.category || s.owner || s.region || s.mode || s.week);
  const total = board ? Object.values(board).flat().length : 0;

  return (
    <>
      <PageHeader title="Board" />

      <form method="get" className="flex flex-wrap items-end gap-x-4 gap-y-3" aria-label="Filter the board">
        {s.week && <input type="hidden" name="week" value="1" />}
        {s.skipped && <input type="hidden" name="skipped" value="1" />}
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Category
          <select name="category" defaultValue={s.category ?? ""} className={select}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Owner
          <select name="owner" defaultValue={s.owner ?? ""} className={select}>
            <option value="">Anyone</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Region
          <select name="region" defaultValue={s.region ?? ""} className={select}>
            <option value="">Everywhere</option>
            <option value="malaysia">Malaysia</option>
            <option value="overseas">Overseas</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Format
          <select name="mode" defaultValue={s.mode ?? ""} className={select}>
            <option value="">Online or in person</option>
            <option value="online">Online</option>
            <option value="in_person">In person</option>
          </select>
        </label>
        <button className="min-h-9 rounded-md border border-line bg-panel px-3.5 text-sm font-semibold hover:bg-panel-2">Apply</button>
        <div className="flex flex-wrap gap-1.5">
          <Toggle s={s} name="week">Due this week</Toggle>
          <Toggle s={s} name="skipped">Show skipped</Toggle>
        </div>
        {filtered && (
          <Link href={`/board${qs({ skipped: s.skipped })}`} className="min-h-9 py-2 text-sm text-muted underline hover:text-text">
            Clear filters
          </Link>
        )}
      </form>

      {error || !board ? (
        <EmptyState title="Can't reach the API">{error}</EmptyState>
      ) : total === 0 && !filtered ? (
        <EmptyState title="Nothing on the board yet">
          Mark a hackathon <strong>Interested</strong> in <Link href="/discover" className="underline">Discover</Link> and it lands in the first column here.
        </EmptyState>
      ) : (
        <>
          {total === 0 && (
            <p className="text-sm text-muted">
              Nothing matches these filters. <Link href={`/board${qs({ skipped: s.skipped })}`} className="underline">Clear them</Link>.
            </p>
          )}
          <Board board={board} />
        </>
      )}
    </>
  );
}
