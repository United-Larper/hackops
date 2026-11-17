"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Workspace tabs: each tab is its own route, so a link opens the right one. */
export function Tabs({ base, tabs }: { base: string; tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Workspace" className="-mx-4 overflow-x-auto overflow-y-hidden border-b border-line px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const href = `${base}${t.href}`;
          const on = t.href ? path.startsWith(href) : path === base;
          return (
            <li key={t.href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`-mb-px flex min-h-11 items-center border-b-2 px-3 text-[15px] font-medium whitespace-nowrap transition-colors ${
                  on ? "border-line-strong font-semibold text-text" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
