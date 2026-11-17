"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icon";
import { refreshDiscovery, type RefreshState } from "./actions";

export function RefreshButton() {
  const [state, action, pending] = useActionState<RefreshState, FormData>(refreshDiscovery, null);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <p role="status" aria-live="polite" className={`text-sm ${state?.failed ? "text-live-text" : "text-muted"}`}>
        {pending ? "Checking Devpost, MLH and the Malaysian list…" : state?.message}
      </p>
      <button
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-rail px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-rail-2 disabled:opacity-60"
      >
        <Icon name="arrow-clockwise" size={16} className={pending ? "animate-spin" : ""} />
        {pending ? "Refreshing" : "Refresh now"}
      </button>
    </form>
  );
}

/** Submit button for the Interested / Skip forms; disabled while the move is saving. */
export function DecideButton({ primary, children }: { primary?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`min-h-10 rounded-md px-3.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        // One primary (ink and gold) action per page: Refresh now. Row actions stay secondary.
        primary ? "border border-line-strong bg-panel hover:bg-text hover:text-ground" : "text-muted hover:bg-panel-2 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
