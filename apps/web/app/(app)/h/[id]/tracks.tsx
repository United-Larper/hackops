"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { PrizeTrack, TrackFit, WorkspaceDto } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { importTracks, saveTracks } from "@/lib/actions";

type Track = WorkspaceDto["prizeTracks"][number];

const FIT: Record<TrackFit, { word: string; cls: string; hint: string }> = {
  fits: { word: "Fits", cls: "bg-won text-on-won", hint: "names the project's tech" },
  maybe: { word: "Maybe", cls: "border border-line-strong", hint: "matches the event's categories, or is a placement prize" },
  no: { word: "No", cls: "text-muted", hint: "no match" },
};
const field = "min-h-10 w-full rounded-md border border-line bg-panel px-3 text-[15px] text-text";
const btn = "min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50";

/** Prize tracks with the finder's verdict, the team's "entering" marks, and typing or importing tracks. */
export function PrizeTracks({ hackathonId, tracks, hasProject, canImport }: { hackathonId: string; tracks: Track[]; hasProject: boolean; canImport: boolean }) {
  const [shown, setShown] = useOptimistic(tracks);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const save = (next: PrizeTrack[], ok: string) =>
    start(async () => {
      setShown(next.map((t) => ({ fit: "no", ...t }) as Track));
      const r = await saveTracks(hackathonId, next);
      setMsg(r.error ? { text: r.error, error: true } : { text: ok });
    });
  const fits = shown.filter((t) => t.fit === "fits").length;
  const maybe = shown.filter((t) => t.fit === "maybe").length;
  const entering = shown.filter((t) => t.entering).length;

  return (
    <section aria-labelledby="tracks-h" className="rounded-[10px] border border-line bg-panel">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="tracks-h" className="font-display text-xl font-bold">Prize tracks</h2>
          {shown.length > 0 && (
            <p className="mt-0.5 text-[13px] text-muted">
              {hasProject ? (
                <>
                  The project fits <Num>{fits}</Num>, maybe <Num>{maybe}</Num> more, of <Num>{shown.length}</Num>
                </>
              ) : (
                <>Link a project on Links &amp; submission to see which tracks fit its tech</>
              )}
              {" · "}entering <Num>{entering}</Num>
            </p>
          )}
        </div>
        {canImport && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setMsg({ text: "Reading the Devpost page" });
                const r = await importTracks(hackathonId);
                setMsg(r.error ? { text: r.error, error: true } : { text: "Imported from Devpost." });
              })
            }
            className={`${btn} inline-flex items-center gap-2`}
          >
            <Icon name="arrow-clockwise" size={16} />
            Import from Devpost
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="px-4 pb-4 pt-2 text-[15px] text-muted sm:px-5">
          No tracks yet. {canImport ? "Import them from the Devpost page, or add" : "Add"} each one from the event page below; the finder then
          marks which ones the project fits.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {shown.map((t, i) => {
            const f = FIT[t.fit];
            return (
              <li key={`${t.name}-${i}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-2.5 sm:px-5">
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={t.entering}
                    disabled={pending}
                    onChange={(e) => save(shown.map((x, j) => (j === i ? { ...x, entering: e.target.checked } : x)), e.target.checked ? `Entering ${t.name}.` : `Not entering ${t.name}.`)}
                    className="size-5 accent-[var(--text)]"
                  />
                  <span className="sr-only">Entering {t.name}</span>
                </label>
                <div className="min-w-0 py-2">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold">
                    {t.name}
                    {(t.prize || t.sponsor) && <span className="text-[13px] font-normal text-muted">{[t.prize, t.sponsor].filter(Boolean).join(" · ")}</span>}
                  </p>
                  {t.description && <p className="mt-0.5 max-w-[70ch] text-[13px] text-muted">{t.description}</p>}
                </div>
                <div className="flex items-center gap-1 py-1.5">
                  <span title={f.hint} className={`rounded-[3px] px-2 py-0.5 text-xs font-semibold ${f.cls}`}>
                    {f.word}
                    <span className="sr-only">: {f.hint}</span>
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save(shown.filter((_, j) => j !== i), `Removed ${t.name}.`)}
                    className="grid size-11 place-items-center rounded-md text-muted hover:bg-panel-2 hover:text-text disabled:opacity-50"
                  >
                    <Icon name="x" size={16} label={`Remove ${t.name}`} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="grid gap-2 border-t border-line px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] sm:px-5"
        action={(fd) => {
          const name = String(fd.get("name")).trim();
          if (!name) return;
          const prize = String(fd.get("prize")).trim() || null;
          const description = String(fd.get("description")).trim() || null;
          save([...shown, { name, prize, description, entering: false }], `Added ${name}.`);
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Track
          <input name="name" required maxLength={200} placeholder="Best use of AI" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Prize <span className="sr-only">(optional)</span>
          <input name="prize" maxLength={200} placeholder="Optional" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          What the judges look for <span className="sr-only">(optional)</span>
          <input name="description" maxLength={2000} placeholder="Optional; the finder matches tech named here" className={field} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button disabled={pending} className={`${btn} inline-flex items-center gap-2`}>
            <Icon name="plus" size={16} />
            Add track
          </button>
          <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
            {msg?.error && <Icon name="warning-circle" size={16} className="text-text" />}
            <span className={msg?.error ? "font-medium text-text" : ""}>{msg?.text}</span>
          </p>
        </div>
      </form>
    </section>
  );
}

const Num = ({ children }: { children: number }) => <span className="font-display text-base font-bold text-text tabular-nums">{children}</span>;
