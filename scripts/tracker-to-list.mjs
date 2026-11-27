// Turns the tracker extract (scripts/extract-tracker.mjs) into the list format import-list reads.
// Usage: node scripts/tracker-to-list.mjs [tracker.local.json] [my-hackathons.local.json] [saved-on YYYY-MM-DD]
//
// The app has one free-text field per hackathon (eligibility), so every fact the tracker shows goes there as labelled
// lines. Deadlines: the tracker shows days left (exact), a past date for closed rows, and only a month for Future rows
// (taken as the 1st). The saved-on date is the day seed.html was saved, which "days left" counts from.
// Location: the page leaves the place blank when it's unknown or hybrid, so an entry already in the output file keeps
// its mode, city and country.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [input = "apps/api/data/tracker.local.json", output = "apps/api/data/my-hackathons.local.json", savedOn = "2026-11-27"] =
  process.argv.slice(2);
const rows = JSON.parse(readFileSync(input, "utf8"));
const before = new Map(existsSync(output) ? JSON.parse(readFileSync(output, "utf8")).map((e) => [e.sourceId, e]) : []);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (s) => MONTHS.findIndex((m) => s.startsWith(m)); // "Sept" -> 8
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}T23:59:00+08:00`;
const [sy, sm, sd] = savedOn.split("-").map(Number);
const saved = Date.UTC(sy, sm - 1, sd);

function deadline(r) {
  if (r.deadlineState === "open") {
    const d = new Date(saved + r.daysLeft * 864e5);
    return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  if (r.deadlineState === "Closed") {
    // "26 Nov" (this year, or last year if that's still ahead) or "26 Nov 2025".
    const [d, mon, y] = r.deadlineShown.split(" ");
    const year = y ? +y : Date.UTC(sy, month(mon), +d) <= saved ? sy : sy - 1;
    return iso(year, month(mon), +d);
  }
  if (r.deadlineState && month(r.deadlineState) >= 0 && r.deadlineShown) return iso(+r.deadlineShown, month(r.deadlineState), 1);
  return null; // TBA, Rolling
}

// "Toronto, Canada" -> city + country; "Malaysia" -> country; "Online" -> neither.
function where(place) {
  if (!place || place === "Online") return { city: null, country: null };
  const i = place.lastIndexOf(", ");
  return i < 0 ? { city: null, country: place } : { city: place.slice(0, i), country: place.slice(i + 2) };
}

const FACTS = [
  ["Summary", "summary"],
  ["Why it's worth it", "whyWorthIt"],
  ["Why it's out", "whyOut"],
  ["What you get", "whatYouGet"],
  ["Catches", "catches"],
  ["Ask UKM/KBS", "askUkmKbs"],
  ["Deadline", "deadline"],
  ["Event", "event"],
  ["Who can enter", "whoCanEnter"],
  ["Solo or team", "soloOrTeam"],
  ["Notes", "note"],
];

const list = rows.map((r) => {
  const d = r.details ?? {};
  const header = [r.type, r.stage, `fit ${r.fit} of 5`, r.deadlineEstimated && "deadline estimated", r.deadlineState === "Rolling" && "rolling deadline", r.deadlineState === "TBA" && "deadline not announced"]
    .filter(Boolean)
    .join(" · ");
  const pills = r.pills.map((p) => (p.note ? `${p.text} (${p.note})` : p.text));
  const checked = [d.checked && `checked ${d.checked}`, d.confidence && `${d.confidence.toLowerCase()} confidence`].filter(Boolean).join(", ");
  const eligibility = [
    `From the team's Opportunities Tracker: ${header}`,
    pills.length && `Flags: ${pills.join("; ")}`,
    ...FACTS.filter(([, k]) => d[k]).map(([label, k]) => `${label}: ${d[k]}`),
    checked && `Source: ${r.source ?? "link"}, ${checked}`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    sourceId: r.id,
    title: r.name,
    url: r.url,
    organizer: r.organizer,
    ...(before.has(r.id)
      ? { mode: before.get(r.id).mode, city: before.get(r.id).city, country: before.get(r.id).country }
      : { mode: r.place === "Online" || !r.place ? "online" : "in_person", ...where(r.place) }),
    registrationClosesAt: deadline(r),
    eligibility,
  };
});

writeFileSync(output, JSON.stringify(list, null, 2) + "\n");
const longest = Math.max(...list.map((e) => e.eligibility.length));
console.log(`Wrote ${list.length} entries to ${output}. Longest eligibility: ${longest} characters.`);
