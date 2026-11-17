"use client";

import { useState, useTransition } from "react";
import { RESULTS, type HackathonResult, type Stage } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { saveRetro } from "@/lib/actions";
import { RESULT_META } from "@/lib/stage";

const area = "rounded-md border border-line bg-panel px-3 py-2 text-[15px] font-normal text-text";
const blank = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export function RetroForm({
  hackathonId, stage, result, resultNote, wentWell, toChange,
}: {
  hackathonId: string; stage: Stage; result: HackathonResult | null; resultNote: string | null; wentWell: string | null; toChange: string | null;
}) {
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex max-w-3xl flex-col gap-5"
      action={(fd) =>
        start(async () => {
          const r = await saveRetro(hackathonId, stage, result, {
            result: (fd.get("result") as HackathonResult | null) ?? null,
            resultNote: blank(fd.get("resultNote")),
            retroWentWell: blank(fd.get("wentWell")),
            retroToChange: blank(fd.get("toChange")),
          });
          setMsg(r.error ? { text: r.error, error: true } : { text: "Retro saved." });
        })
      }
    >
      <fieldset>
        <legend className="font-display text-xl font-bold">Result</legend>
        <p className="mt-1 text-[13px] text-muted">
          {stage === "results" ? "Changing it updates the form guide." : "Picking one moves the hackathon to Results."}
        </p>
        <div className="mt-3 grid max-w-md grid-cols-3 gap-2">
          {RESULTS.map((r) => (
            <label
              key={r}
              className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-line bg-panel text-sm font-semibold hover:border-line-strong has-[:checked]:border-line-strong has-[:checked]:outline-2 has-[:checked]:outline-line-strong has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
            >
              <input type="radio" name="result" value={r} defaultChecked={result === r} className="sr-only" />
              <span className={`grid size-[26px] place-items-center rounded-[3px] font-display text-base font-bold ${RESULT_META[r].cls}`} aria-hidden>
                {RESULT_META[r].letter}
              </span>
              {RESULT_META[r].word}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        About the result
        <textarea name="resultNote" rows={2} maxLength={2000} defaultValue={resultNote ?? ""} placeholder="Which track, what the judges said" className={area} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What went well
          <textarea name="wentWell" rows={6} maxLength={4000} defaultValue={wentWell ?? ""} className={area} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What to change next time
          <textarea name="toChange" rows={6} maxLength={4000} defaultValue={toChange ?? ""} className={area} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50">
          {pending ? "Saving" : "Save retro"}
        </button>
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
          {msg?.error && <Icon name="warning-circle" size={16} className="text-text" />}
          <span className={msg?.error ? "font-medium text-text" : ""}>{msg?.text}</span>
        </p>
      </div>
    </form>
  );
}
