import { unstable_rethrow } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import type { CategoryDto, MeDto, MemberDto, TeamDto } from "@hackops/shared";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { api, ApiError } from "@/lib/api";
import { logout } from "@/lib/actions";
import { initials } from "@/lib/workspace";
import { Bookmarklet } from "./bookmarklet";
import { TeamForm } from "./team-form";

export const metadata: Metadata = { title: "Settings" };

/** What registration forms ask each person, in the order the readiness list names them. */
const SIGNUP_FIELDS = [
  ["email", "email"],
  ["organisation", "organisation"],
  ["githubUrl", "GitHub"],
  ["linkedinUrl", "LinkedIn"],
  ["tshirtSize", "T-shirt"],
  ["dietary", "dietary needs"],
] as const satisfies readonly (readonly [keyof MemberDto, string])[];

export default async function SettingsPage() {
  let team: TeamDto | null = null;
  let me: MeDto | null = null;
  let members: MemberDto[] = [];
  let categories: CategoryDto[] = [];
  let error: string | null = null;
  try {
    [team, members, categories, me] = await Promise.all([
      api<TeamDto | null>("/team"), api<MemberDto[]>("/members"), api<CategoryDto[]>("/categories"), api<MeDto>("/auth/me"),
    ]);
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
    error = e instanceof ApiError ? e.message : "Couldn't load the settings.";
  }
  // The bookmarklet and the calendar link use this app's address: SITE_URL when hosted, else the one the browser used.
  const host = (await headers()).get("host") ?? "";
  const origin = process.env.SITE_URL?.replace(/\/$/, "") ?? (/^[\w.-]+(:\d+)?$/.test(host) ? `http://${host}` : "http://localhost:3200");
  const ready = members.filter((m) => SIGNUP_FIELDS.every(([k]) => m[k])).length;

  return (
    <>
      <PageHeader title="Settings" />
      {error ? (
        <EmptyState title="Settings unavailable">{error}</EmptyState>
      ) : (
        <div className="flex max-w-3xl flex-col gap-10">
          {me && (
            <section aria-label="Your account" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-line bg-panel px-5 py-4">
              <p className="min-w-0 flex-1 text-[15px]">
                Signed in as <span className="font-semibold">{me.name}</span>
              </p>
              <Link href={`/team/${me.id}`} className="min-h-10 content-center rounded-md border border-line px-3.5 text-sm font-semibold hover:border-line-strong">
                Your details and password
              </Link>
              <form action={logout}>
                <button className="min-h-10 rounded-md border border-line px-3.5 text-sm font-semibold hover:border-line-strong">Sign out</button>
              </form>
            </section>
          )}
          <section aria-labelledby="team-h" className="flex flex-col gap-3">
            <h2 id="team-h" className="font-display text-2xl font-bold">Team profile</h2>
            <TeamForm team={team} categories={categories} />
          </section>

          <section aria-labelledby="signup-h" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="signup-h" className="font-display text-2xl font-bold">Sign-up details</h2>
              {members.length > 0 && (
                <p className="text-[13px] text-muted">
                  <span className="font-display text-xl font-bold text-text tabular-nums">{ready}</span> of{" "}
                  <span className="font-display text-xl font-bold text-text tabular-nums">{members.length}</span> complete
                </p>
              )}
            </div>
            {members.length === 0 ? (
              <EmptyState title="No members yet">
                Add members on the <Link href="/team" className="font-semibold text-text underline underline-offset-2">Team</Link> page. Each person&apos;s email, organisation, links, T-shirt size and dietary needs show up here, ready for the bookmarklet.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line rounded-[10px] border border-line bg-panel">
                {members.map((m) => {
                  const missing = SIGNUP_FIELDS.filter(([k]) => !m[k]).map(([, l]) => l);
                  return (
                    <li key={m.id}>
                      <Link href={`/team/${m.id}`} className="group flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rail font-display text-sm font-bold text-rail-strong" aria-hidden>
                          {initials(m.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold group-hover:underline">{m.name}</span>
                          <span className="block text-[13px] text-muted">
                            {missing.length === 0 ? "Everything a sign-up form asks for is filled in." : `Missing ${missing.join(", ")}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold text-muted group-hover:text-text">Edit</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="fill-h" className="flex flex-col gap-3">
            <h2 id="fill-h" className="font-display text-2xl font-bold">Sign-up bookmarklet</h2>
            {team ? (
              <Bookmarklet origin={origin} token={me?.fillToken ?? null} />
            ) : (
              <EmptyState title="Save the team profile first">The bookmarklet fills registration forms from the team profile, so it appears once the profile above is saved.</EmptyState>
            )}
          </section>

          <section aria-labelledby="cal-h" className="flex flex-col gap-3">
            <h2 id="cal-h" className="font-display text-2xl font-bold">Calendar feed</h2>
            {me?.fillToken ? (
              <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-panel px-5 py-5">
                <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted">
                  Every deadline and open task, with reminders. Subscribe from Outlook or Apple Calendar on this computer, or open it and import the file into Google Calendar. It uses the same secret as your bookmarklet, so a new secret retires this link too.
                </p>
                <code className="block overflow-x-auto rounded-md border border-line bg-panel-2 px-3 py-2 text-[13px] whitespace-nowrap">{`${origin}/calendar.ics?token=${me.fillToken}`}</code>
              </div>
            ) : (
              <EmptyState title="Make your secret first">The calendar link uses the same secret as your bookmarklet. Make the bookmarklet above and the link appears here.</EmptyState>
            )}
          </section>
        </div>
      )}
    </>
  );
}
