"use client";

import { useActionState, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { setTwoStep, startTwoStep } from "@/lib/actions";

const field = "min-h-10 rounded-md border border-line bg-panel px-3 text-[15px] font-normal text-text";
const button = "min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50";

/**
 * Shown only on your own page. On: signing in also asks for a 6-digit code from an authenticator app.
 * The parent keys this by `on`, so the form starts fresh after turning it on or off.
 */
export function TwoStepForm({ on }: { on: boolean }) {
  const [state, action, pending] = useActionState(setTwoStep, {});
  const [setup, setSetup] = useState<{ secret?: string; uri?: string; error?: string }>({});
  const [starting, start] = useTransition();

  return (
    <section aria-labelledby="two-step-h" className="rounded-[10px] border border-line bg-panel px-5 py-4">
      <h2 id="two-step-h" className="font-display text-xl font-bold">Two-step sign-in</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        {on
          ? "On. Signing in asks for a code from your authenticator app."
          : "Off. Turn it on so your password alone can't sign in as you. Works with any authenticator app."}
      </p>

      {!on && !setup.secret && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={starting} onClick={() => start(async () => setSetup(await startTwoStep()))} className={button}>
            {starting ? "Making a key" : "Set up"}
          </button>
          {setup.error && <p role="status" className="flex items-center gap-1.5 text-sm font-medium"><Icon name="warning-circle" size={16} />{setup.error}</p>}
        </div>
      )}

      {(on || setup.secret) && (
        <form action={action} className="mt-3 flex flex-col gap-3">
          {setup.secret && (
            <>
              <input type="hidden" name="secret" value={setup.secret} />
              <div className="flex flex-col gap-1 text-sm font-medium">
                Add this key to your authenticator app
                <code className="rounded-md border border-line bg-panel-2 px-3 py-2 text-[15px] tracking-[0.08em] break-all">
                  {setup.secret.match(/.{1,4}/g)!.join(" ")}
                </code>
                <a href={setup.uri} className="text-[13px] font-semibold underline underline-offset-2">On this phone? Open it in the app</a>
              </div>
            </>
          )}
          <input type="email" name="username" autoComplete="username" hidden readOnly />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Your password
            <input name="password" type="password" required autoComplete="current-password" maxLength={200} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Code from the app
            <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} className={`${field} tracking-[0.2em] tabular-nums`} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending} className={button}>{pending ? "Saving" : on ? "Turn off" : "Turn on"}</button>
            <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm font-medium">
              {state.error && <><Icon name="warning-circle" size={16} />{state.error}</>}
            </p>
          </div>
          {!on && <p className="text-[13px] text-muted">Turning it on signs you out everywhere else. Lost your phone? A teammate&apos;s set-password turns it off.</p>}
        </form>
      )}
    </section>
  );
}
