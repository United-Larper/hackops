import { DEADLINE_LABEL, type DueItem } from "./deadlines";

// Hand-written iCalendar (RFC 5545): the format is small and a library would be most of the code.

const CRLF = "\r\n";
const ALARMS = ["-P7D", "-P2D", "-PT3H"]; // 7 days, 2 days and 3 hours before
const octets = new TextEncoder();

/** TEXT value escaping (RFC 5545 3.3.11). */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");

/** UTC in basic format: 20301110T093000Z. */
const utc = (d: Date | string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Folds to at most 75 octets per physical line, continuation lines starting with a space, never splitting a character. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = octets.encode(ch).length;
    if (size + n > 75) {
      out.push(cur);
      cur = " ";
      size = 1;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out.join(CRLF);
}

const summary = (i: DueItem) => (i.task ? `Task: ${i.task} · ${i.hackathon}` : `${DEADLINE_LABEL[i.kind]} · ${i.hackathon}`);

/** The calendar feed: one zero-length event per deadline (DTEND omitted, RFC 5545 wants it after DTSTART), each with three alarms. */
export function toIcs(items: DueItem[], now: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HackOps//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:HackOps deadlines",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const i of items) {
    const s = text(summary(i));
    lines.push("BEGIN:VEVENT", `UID:${i.id}@hackops`, `DTSTAMP:${utc(now)}`, `DTSTART:${utc(i.at)}`, `SUMMARY:${s}`);
    for (const t of ALARMS) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${s}`, `TRIGGER:${t}`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}
