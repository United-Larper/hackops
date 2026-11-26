import type { Metadata } from "next";
import { Wordmark } from "@/components/shell/rail";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/** Outside the app shell: the ink frame carries the wordmark, the neutral ground carries the form. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
      <header className="rail flex items-center bg-rail px-4 py-3 md:flex-col md:items-start md:justify-between md:px-8 md:py-8">
        <Wordmark size={28} />
        <p className="hidden max-w-[30ch] text-[15px] leading-relaxed text-rail-text md:block">
          The team&apos;s hackathon manager: every deadline, every entry, every result.
        </p>
      </header>
      <main className="flex items-start justify-center px-4 pt-12 pb-16 sm:px-7 md:items-center md:pt-0">
        <div className="flex w-full max-w-[380px] flex-col gap-6">
          <h1 className="font-display text-[34px] leading-none font-bold tracking-[-0.01em] sm:text-[40px]">Sign in</h1>
          <LoginForm next={typeof next === "string" ? next : ""} />
          <p className="text-[13px] leading-relaxed text-muted">
            No password yet, or forgot it? A teammate runs <code className="font-semibold text-text">pnpm --filter api set-password your@email</code> on the computer running HackOps and gives you the temporary password.
          </p>
        </div>
      </main>
    </div>
  );
}
