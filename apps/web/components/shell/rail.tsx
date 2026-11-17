"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormGuide, type Result } from "../form-guide";
import { Icon } from "../icon";
import { NAV } from "./nav";

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" width={size} height={size} />
      <span className="font-display text-[26px] leading-none font-extrabold tracking-[0.01em]">
        <span className="text-gold">HACK</span>
        <span className="text-rail-strong">OPS</span>
      </span>
    </span>
  );
}

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(`${href}/`);
}

/** Desktop navigation: the ink rail with the team's form guide at its foot. */
export function Rail({ form }: { form: Result[] }) {
  const active = useActive();
  return (
    <nav aria-label="Main" className="rail sticky top-0 hidden h-dvh w-[220px] flex-col gap-1 border-r border-rail-line bg-rail px-4 py-6 text-rail-text md:flex">
      <Link href="/board" className="mb-7 px-2" aria-label="HackOps home">
        <Wordmark />
      </Link>
      {NAV.map((item) => {
        const on = active(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-2.5 py-2.5 text-[15px] font-medium transition-colors ${
              on ? "bg-gold font-semibold text-on-gold" : "hover:bg-rail-2 hover:text-rail-strong"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-rail-line px-2.5 pt-4">
        <p className="mb-2 text-xs font-medium tracking-[0.04em] text-rail-muted">Team form, last 5</p>
        <FormGuide results={form} />
      </div>
    </nav>
  );
}

/** Phone navigation: top bar with the wordmark and settings, five-item bottom bar. */
export function MobileBars() {
  const active = useActive();
  return (
    <>
      <header className="rail sticky top-0 z-20 flex items-center justify-between bg-rail px-4 py-3 md:hidden">
        <Link href="/board" aria-label="HackOps home">
          <Wordmark size={24} />
        </Link>
        <Link href="/settings" aria-label="Settings" className="grid size-11 place-items-center rounded-md text-rail-text">
          <Icon name="gear-six" size={20} />
        </Link>
      </header>
      <nav aria-label="Main" className="rail fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-rail-line bg-rail pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.filter((n) => n.mobile).map((item) => {
          const on = active(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${on ? "text-gold" : "text-rail-text"}`}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
