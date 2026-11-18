// Every time in HackOps is shown in Malaysia time.
export const MYT = "Asia/Kuala_Lumpur";

const fmt = (opts: Intl.DateTimeFormatOptions, locale = "en-MY") => new Intl.DateTimeFormat(locale, { timeZone: MYT, ...opts });
const weekday = fmt({ weekday: "short" });
const dayMonth = fmt({ day: "numeric", month: "short" });
const hm = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, "en-GB");
const dom = fmt({ day: "numeric" });
const mon = fmt({ month: "short" });

export const dayName = (d: Date | string) => weekday.format(new Date(d)).toUpperCase();
export const dayOfMonth = (d: Date | string) => dom.format(new Date(d));
export const monthName = (d: Date | string) => mon.format(new Date(d)).toUpperCase();
export const shortDate = (d: Date | string) => `${weekday.format(new Date(d))} ${dayMonth.format(new Date(d))}`;
export const clockTime = (d: Date | string) => hm.format(new Date(d));
export const sameDay = (a: Date, b: Date) => a.toLocaleDateString("en-CA", { timeZone: MYT }) === b.toLocaleDateString("en-CA", { timeZone: MYT });

/** "2d 18h", "3h 41m"; "closed" once passed. */
export function countdown(to: Date | string, now = new Date()) {
  const ms = new Date(to).getTime() - now.getTime();
  if (ms <= 0) return "closed";
  const m = Math.round(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m % 60}m`;
}

/** Signal red applies within 24 hours (DESIGN.md: The Reserved Red Rule). */
export const isUrgent = (to: Date | string, now = new Date()) => {
  const ms = new Date(to).getTime() - now.getTime();
  return ms > 0 && ms < 24 * 3_600_000;
};
