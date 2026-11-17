import { MobileBars, Rail } from "@/components/shell/rail";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // ponytail: no results yet; the team's form guide is fed once results exist (phase 05).
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <Rail form={[]} />
      <MobileBars />
      <main className="flex min-w-0 flex-col gap-5 px-4 pt-5 pb-24 sm:px-7 md:pb-8">{children}</main>
    </div>
  );
}
