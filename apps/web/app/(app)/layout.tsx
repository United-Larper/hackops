import { unstable_rethrow } from "next/navigation";
import type { MeDto } from "@hackops/shared";
import { MobileBars, Rail } from "@/components/shell/rail";
import { api } from "@/lib/api";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Who is signed in, for the rail. A dead session redirects to /login; a down API just leaves the name off.
  const me = await api<MeDto>("/auth/me").catch((e: unknown) => {
    unstable_rethrow(e);
    return null;
  });
  // ponytail: no results yet; the team's form guide is fed once results exist (phase 05).
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <Rail form={[]} me={me} />
      <MobileBars />
      <main className="flex min-w-0 flex-col gap-5 px-4 pt-5 pb-24 sm:px-7 md:pb-8">{children}</main>
    </div>
  );
}
