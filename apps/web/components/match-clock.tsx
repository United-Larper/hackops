"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/**
 * The signature move: a live countdown in condensed numerals, ticking once a second.
 * Signal red is reserved for this clock and for anything due within 24 hours.
 */
export function MatchClock({ to, label = "Live · to submission", tone = "dark" }: { to: string; label?: string; tone?: "dark" | "light" }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const over = now >= target;
  const color = tone === "dark" ? "text-live" : "text-live-text";
  return (
    <div className="flex items-baseline gap-2">
      <time
        dateTime={to}
        suppressHydrationWarning
        className={`font-display text-[30px] leading-none font-extrabold ${color}`}
        aria-label={over ? "Deadline passed" : `${parts(target - now).replaceAll(":", " ")} left`}
      >
        {parts(target - now)}
      </time>
      <span className={`text-xs font-semibold tracking-[0.08em] uppercase ${color}`}>{over ? "Full time" : label}</span>
    </div>
  );
}
