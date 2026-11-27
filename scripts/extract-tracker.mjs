// Extracts every row from a saved copy of the Opportunities Tracker page into clean JSON: no markup, no page noise.
// Usage: node scripts/extract-tracker.mjs [seed.html] [apps/api/data/tracker.local.json]
//
// The page fills a row's details (summary, why it's worth it, deadline, event, ...) only while that row is open, so a
// saved page has details only for the rows that were expanded. To get them all, before saving run this in the
// browser console, in the page's frame:
//   document.querySelectorAll('button.name[aria-expanded="false"]').forEach((b) => b.click())
// The header of every row is always there. The saved list is whichever tab was open: Everything has the most rows.
import { readFileSync, writeFileSync } from "node:fs";

const [input = "seed.html", output = "apps/api/data/tracker.local.json"] = process.argv.slice(2);
const html = readFileSync(input, "utf8");

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m);
const text = (s) => decode(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
const first = (re, s) => s.match(re)?.[1];

// Details labels as the page shows them, mapped to JSON keys.
const FACTS = {
  "Why it's worth it": "whyWorthIt",
  "Why it's out": "whyOut",
  "What you get": "whatYouGet",
  Catches: "catches",
  "Ask UKM/KBS": "askUkmKbs",
  Deadline: "deadline",
  Event: "event",
  "Who can enter": "whoCanEnter",
  "Solo or team": "soloOrTeam",
};

// The rendered list only: the page's own script also holds an <article> template.
const list = html.slice(html.indexOf('<div id="list"'), html.lastIndexOf("<script"));
const rows = [];
const unknownLabels = new Set();

for (const section of list.split('<section class="group">').slice(1)) {
  const band = text(first(/<h3 class="group-h"[^>]*><span>(.*?)<\/span>/s, section) ?? "") || null;
  for (const [article] of section.matchAll(/<article class="opp[ "][\s\S]*?<\/article>/g)) {
    const id = first(/data-id="([^"]+)"/, article);

    // Countdown: "<b>12</b><small><span>days</span><span>~5 Dec</span></small>", or Closed / TBA / Rolling, or a month for Future rows.
    const cd = first(/<div class="cd[^"]*">([\s\S]*?)<\/div>/, article) ?? "";
    const big = text(first(/<b>(.*?)<\/b>/s, cd) ?? "");
    const spans = [...cd.matchAll(/<span>(.*?)<\/span>/gs)].map((m) => text(m[1])).filter((s) => s !== "days" && s !== "day");
    const when = spans[0] ?? null;

    // Meta: source link · organizer · place · type (organizer, place and type are each left out when empty).
    const metaHtml = first(/<div class="meta">([\s\S]*?)<\/div>/, article) ?? "";
    const parts = metaHtml.replace(/<a class="src"[^>]*>.*?<\/a>/s, "").split("·").map(text).filter(Boolean);
    const type = parts.length ? parts.pop() : null;
    const [organizer = null, place = null] = parts;

    const pills = [...article.matchAll(/<span class="pill ([^"]*)"(?: title="([^"]*)")?>(.*?)<\/span>/gs)].map((m) => ({
      text: text(m[3]),
      tone: m[1].replace(/\btrack\b/, "").trim() || null,
      track: /\btrack\b/.test(m[1]),
      ...(m[2] ? { note: decode(m[2]) } : {}),
    }));
    // The pill marked "track" is the row's stage: Apply now or Watch, and on the Everything tab also Future, Excluded, ...
    const stage = pills.find((p) => p.track)?.text ?? null;

    const row = {
      id,
      name: text(first(/<button[^>]*class="name"[^>]*>(.*?)<\/button>/s, article) ?? ""),
      url: decode(first(/<a class="src" href="([^"]*)"/, metaHtml) ?? "") || null,
      source: text(first(/<a class="src"[^>]*>(.*?)<\/a>/s, metaHtml) ?? "") || null,
      organizer,
      place,
      type,
      stage,
      fit: Number(first(/Fit (\d) of 5/, article) ?? 0),
      daysLeft: /^\d+$/.test(big) ? Number(big) : null,
      deadlineShown: when ? when.replace(/^~/, "") : null,
      deadlineEstimated: when?.startsWith("~") ?? false,
      deadlineState: /^\d+$/.test(big) ? "open" : big || null, // Closed, TBA, Rolling, or a month name on Future rows
      band,
      pills: pills.filter((p) => !p.track).map(({ track, ...p }) => p),
      details: null,
    };

    const details = first(/<div class="details"[^>]*>([\s\S]*)/, article);
    if (details) {
      const d = { summary: text(first(/<p class="summary">([\s\S]*?)<\/p>/, details) ?? "") || null };
      for (const [, dt, dd] of details.matchAll(/<dt>(.*?)<\/dt><dd>([\s\S]*?)<\/dd>/g)) {
        const label = text(dt);
        if (!FACTS[label]) unknownLabels.add(label);
        d[FACTS[label] ?? label] = text(dd);
      }
      const saved = [...details.matchAll(/<span class="saved">(.*?)<\/span>/gs)].map((m) => text(m[1]));
      const checkedLine = saved.find((s) => /Checked|confidence/.test(s)) ?? "";
      d.checked = first(/Checked ([^·]+)/, checkedLine)?.trim() ?? null;
      d.confidence = first(/(\w+) confidence/, checkedLine) ?? null;
      d.note = text(first(/<textarea[^>]*>([\s\S]*?)<\/textarea>/, details) ?? "") || null;
      row.details = d;
    }
    rows.push(row);
  }
}

// Fail loudly rather than silently drop rows: the page's group headings say how many rows each band holds.
const expected = [...list.matchAll(/<h3 class="group-h"[\s\S]*?<span class="n">(\d+)<\/span>/g)].reduce((n, m) => n + Number(m[1]), 0);
const ids = new Set(rows.map((r) => r.id));
if (rows.length !== expected || ids.size !== rows.length) {
  console.error(`Found ${rows.length} rows (${ids.size} unique), but the page's groups count ${expected}.`);
  process.exitCode = 1;
}
if (unknownLabels.size) console.warn(`Unknown detail labels kept as-is: ${[...unknownLabels].join(", ")}`);

writeFileSync(output, JSON.stringify(rows, null, 2) + "\n");
const withDetails = rows.filter((r) => r.details).length;
console.log(`Wrote ${rows.length} rows to ${output}: ${withDetails} with details, ${rows.length - withDetails} without.`);
const byType = Object.entries(rows.reduce((a, r) => ({ ...a, [r.type]: (a[r.type] ?? 0) + 1 }), {}));
console.log("By type:", Object.fromEntries(byType.sort((a, b) => b[1] - a[1])));
if (withDetails < rows.length) {
  console.log("Rows without details were collapsed when the page was saved. Expand them all, then save again.");
}
