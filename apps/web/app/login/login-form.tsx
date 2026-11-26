"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { login } from "@/lib/actions";

const field = "min-h-11 rounded-md border border-line bg-panel px-3 text-[15px] text-text";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" autoFocus maxLength={200} defaultValue={state.email} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" maxLength={200} className={field} />
      </label>
      <button disabled={pending} className="min-h-11 rounded-md bg-rail px-4 text-[15px] font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-50">
        {pending ? "Signing in" : "Sign in"}
      </button>
      <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-sm font-medium">
        {state.error && <><Icon name="warning-circle" size={16} />{state.error}</>}
      </p>
    </form>
  );
}
