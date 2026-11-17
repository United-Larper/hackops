import type { Metadata } from "next";
import { FormGuide } from "@/components/form-guide";
import { Icon, type IconName } from "@/components/icon";
import { MatchClock } from "@/components/match-clock";
import { Fixtures } from "@/components/shell/fixtures";
import { Wordmark } from "@/components/shell/rail";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };
export const dynamic = "force-dynamic"; // countdowns are relative to now

const SWATCHES = [
  ["ground", "bg-ground"], ["panel", "bg-panel"], ["panel-2", "bg-panel-2"], ["line", "bg-line"],
  ["text", "bg-text"], ["muted", "bg-muted"], ["rail", "bg-rail"], ["gold", "bg-gold"],
  ["live (reserved)", "bg-live"], ["won", "bg-won"], ["part", "bg-part"],
] as const;

const ICONS: IconName[] = [
  "compass", "kanban", "users-three", "folder-simple", "trophy", "gear-six", "plus", "funnel-simple",
  "arrow-clockwise", "calendar-blank", "clock", "magnifying-glass", "caret-down", "x", "check", "warning-circle", "arrow-right",
];

// Synthetic demo deadlines, relative to page load.
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

function Sheet({ theme }: { theme: "light" | "dark" }) {
  return (
    <section data-theme={theme} className="flex flex-col gap-8 bg-ground p-6 text-text sm:p-8">
      <h2 className="font-display text-[40px] leading-none font-bold">{theme === "light" ? "Light" : "Dark"}</h2>

      <div>
        <h3 className="mb-3 font-display text-xl font-bold">Colour</h3>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, cls]) => (
            <li key={name} className="text-sm">
              <span className={`block h-12 rounded-md border border-line ${cls}`} />
              {name}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="mb-1 font-display text-xl font-bold">Type</h3>
        <p className="font-display text-[40px] leading-none font-bold">Board 40 · condensed 700</p>
        <p className="font-display text-[22px] font-bold">Kick-off 23:59 · 22 condensed</p>
        <p className="text-[15px] font-semibold">Global AI Agents Challenge · 15 Barlow 600</p>
        <p className="text-[15px]">Body text in Barlow 400 at 15px, for descriptions and notes.</p>
        <p className="text-[13px] text-muted">Muted 13px for metadata: Kuala Lumpur · hybrid</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-xl font-bold">Controls</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-rail px-4 py-2.5 text-sm font-semibold text-gold">Add hackathon</button>
          <button className="rounded-md border border-line bg-panel px-4 py-2.5 text-sm font-semibold">Skip</button>
          <button disabled className="rounded-md border border-line bg-panel px-4 py-2.5 text-sm font-semibold opacity-50">Disabled</button>
          <span className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm font-medium">Due this week</span>
          <span className="rounded bg-panel-2 px-2 py-0.5 text-xs font-medium">FinTech</span>
        </div>
        <label className="flex max-w-sm flex-col gap-1 text-sm font-medium">
          Hackathon link
          <input className="rounded-md border border-line bg-panel px-3 py-2 text-[15px] font-normal" placeholder="https://devpost.com/…" />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-xl font-bold">Match clock and form guide</h3>
        <div className="rail flex flex-col gap-3 rounded-[10px] bg-rail p-4">
          <MatchClock to={inHours(66.2)} />
          <FormGuide results={["W", "P", "F", "P", "W"]} />
        </div>
        <MatchClock to={inHours(3.7)} label="Registration closes" tone="light" />
      </div>

      <div>
        <h3 className="mb-3 font-display text-xl font-bold">Icons · Phosphor bold</h3>
        <ul className="flex flex-wrap gap-4">
          {ICONS.map((n) => (
            <li key={n} title={n}>
              <Icon name={n} size={22} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="flex flex-col">
      <header className="rail flex items-center justify-between bg-rail px-6 py-4 sm:px-8">
        <Wordmark />
        <span className="hidden text-sm text-rail-muted sm:inline">Styleguide · demo data is synthetic</span>
      </header>
      <div className="px-6 pt-6 sm:px-8">
        <Fixtures
          items={[
            { id: "a", at: inHours(3.7), event: "Selangor Smart City Hack", what: "Registration closes" },
            { id: "b", at: inHours(66.2), event: "Global AI Agents Challenge · online", what: "Submission due" },
            { id: "c", at: inHours(108), event: "Penang Health Hack", what: "Event starts" },
          ]}
        />
      </div>
      <div className="grid lg:grid-cols-2">
        <Sheet theme="light" />
        <Sheet theme="dark" />
      </div>
    </main>
  );
}
