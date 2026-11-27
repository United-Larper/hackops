"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { login } from "@/lib/actions";

const field = "min-h-11 rounded-md border border-line bg-panel px-3 text-[15px] text-text";

/**
 * Email and password are held here, not reset by the action: when the API asks for an authenticator code, the code
 * field appears under them and the same form is sent again with it.
 */
export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" autoFocus maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
      </label>
      {state.needCode && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Code from your authenticator app
          <input name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} className={`${field} tracking-[0.2em] tabular-nums`} />
        </label>
      )}
      <button disabled={pending} className="min-h-11 rounded-md bg-rail px-4 text-[15px] font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-50">
        {pending ? "Signing in" : "Sign in"}
      </button>
      <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-sm font-medium">
        {state.error && <><Icon name="warning-circle" size={16} />{state.error}</>}
      </p>
    </form>
  );
}
