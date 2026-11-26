"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { changePassword } from "@/lib/actions";

const field = "min-h-10 rounded-md border border-line bg-panel px-3 text-[15px] font-normal text-text";

/** Shown only on your own page. Your other sessions (another browser, a phone) are signed out. */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <section aria-labelledby="password-h" className="rounded-[10px] border border-line bg-panel px-5 py-4">
      <h2 id="password-h" className="font-display text-xl font-bold">Password</h2>
      <form action={action} key={state.done ? "done" : "form"} className="mt-3 flex flex-col gap-3">
        <input type="email" name="username" autoComplete="username" hidden readOnly />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Current password
          <input name="current" type="password" required autoComplete="current-password" maxLength={200} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          New password
          <input name="next" type="password" required minLength={10} maxLength={200} autoComplete="new-password" aria-describedby="password-hint" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          New password again
          <input name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={field} />
        </label>
        <p id="password-hint" className="text-[13px] text-muted">At least 10 characters. Changing it signs you out everywhere else.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="min-h-10 rounded-md border border-line-strong bg-panel px-4 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50">
            {pending ? "Changing" : "Change password"}
          </button>
          <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm font-medium">
            {state.error && <><Icon name="warning-circle" size={16} />{state.error}</>}
            {state.done && "Password changed."}
          </p>
        </div>
      </form>
    </section>
  );
}
