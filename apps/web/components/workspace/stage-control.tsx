"use client";

import { useState, useTransition } from "react";
import type { Stage } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { AskDialog, Menu } from "@/components/stage";
import { STAGE_NAME, askFor, type AskKind, type MoveOpts } from "@/lib/stage";
import { moveCard } from "@/lib/actions";

const TARGETS: Stage[] = ["interested", "registered", "building", "submitted", "results", "skipped"];

/** The workspace header's stage control: same rules and questions as moving a card on the board. */
export function StageControl({ id, title, stage, decisionNote }: { id: string; title: string; stage: Stage; decisionNote: string | null }) {
  const [ask, setAsk] = useState<AskKind | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const commit = (to: Stage, opts: MoveOpts = {}) =>
    start(async () => {
      setError("");
      const r = await moveCard(id, to, opts);
      if (r.error) setError(r.error);
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <p role="status" aria-live="polite" className="text-sm font-medium">
        {pending ? <span className="text-muted">Saving…</span> : error && <><Icon name="warning-circle" size={15} className="mr-1 align-[-2px]" />{error}</>}
      </p>
      <Menu
        id={`stage-${id}`}
        label={<>{STAGE_NAME[stage]} <Icon name="caret-down" size={14} /></>}
        ariaLabel={`Stage: ${STAGE_NAME[stage]}. Change stage`}
        heading="Move to"
        buttonClass="min-h-10 border border-line-strong bg-panel px-3.5 hover:bg-panel-2"
        items={TARGETS.filter((s) => s !== stage).map((s) => ({
          key: s,
          label: STAGE_NAME[s],
          onSelect: () => {
            const kind = askFor(stage, s);
            if (kind) setAsk(kind);
            else commit(s);
          },
        }))}
      />
      {ask && (
        <AskDialog
          kind={ask}
          title={title}
          decisionNote={decisionNote}
          onClose={() => setAsk(null)}
          onConfirm={(to, opts) => {
            setAsk(null);
            commit(to, opts);
          }}
        />
      )}
    </div>
  );
}
