"use client";

import { useOptimistic, useRef, useState, useTransition, type DragEvent } from "react";
import type { MemberDto, TaskDto, TaskStatus } from "@hackops/shared";
import { Icon } from "@/components/icon";
import { Menu } from "@/components/stage";
import { addTask, deleteTask, updateTask, type TaskFields } from "@/lib/actions";
import { MYT, isUrgent, shortDate } from "@/lib/time";

const COLS: { status: TaskStatus; name: string; hint: string }[] = [
  { status: "todo", name: "To do", hint: "Nothing waiting. Add a task above." },
  { status: "doing", name: "Doing", hint: "Drag a task here when someone starts it." },
  { status: "done", name: "Done", hint: "Finished tasks land here." },
];
const NAME = Object.fromEntries(COLS.map((c) => [c.status, c.name])) as Record<TaskStatus, string>;
const DRAG = "application/x-hackops-task";
const field = "min-h-10 rounded-md border border-line bg-panel px-3 text-[15px] text-text";
/** The MYT calendar day of a stored due time, for a date input. */
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: MYT }) : "");
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function TaskBoard({ hackathonId, tasks, members }: { hackathonId: string; tasks: TaskDto[]; members: MemberDto[] }) {
  const [shown, move] = useOptimistic(tasks, (list, m: { id: string; status: TaskStatus }) => list.map((t) => (t.id === m.id ? { ...t, status: m.status } : t)));
  const [, start] = useTransition();
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<TaskDto | null>(null);

  const report = (r: { error?: string }, ok: string) => setStatus(r.error ? { text: r.error, error: true } : { text: ok });
  const setTaskStatus = (t: TaskDto, to: TaskStatus) => {
    if (t.status === to) return;
    start(async () => {
      move({ id: t.id, status: to });
      report(await updateTask(hackathonId, t.id, { status: to }), `${t.title} moved to ${NAME[to]}.`);
    });
  };
  const drop = (to: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const t = shown.find((x) => x.id === e.dataTransfer.getData(DRAG));
    if (t) setTaskStatus(t, to);
  };

  return (
    <div className="flex flex-col gap-4">
      <AddTask hackathonId={hackathonId} members={members} onDone={report} />
      <p role="status" aria-live="polite" className="flex min-h-6 items-center gap-1.5 text-sm text-muted">
        {status?.error && <Icon name="warning-circle" size={16} className="text-text" />}
        <span className={status?.error ? "font-medium text-text" : ""}>{status?.text}</span>
      </p>
      <div className="-mx-4 overflow-x-auto px-4 pb-3 max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 sm:mx-0 sm:px-0">
        <ol className="grid grid-cols-[repeat(3,minmax(220px,1fr))] gap-3.5 max-sm:grid-cols-[repeat(3,78vw)]" aria-label="Task statuses">
          {COLS.map((col) => {
            const list = shown.filter((t) => t.status === col.status);
            return (
              <li
                key={col.status}
                className="flex min-h-[260px] snap-start flex-col"
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(DRAG)) return;
                  e.preventDefault();
                  if (over !== col.status) setOver(col.status);
                }}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
                onDrop={drop(col.status)}
              >
                <h2 className="mb-2.5 flex justify-between border-b-2 border-line-strong px-0.5 pb-2.5 font-display text-[17px] font-bold tracking-[0.05em] uppercase">
                  {col.name}
                  <span className="text-muted tabular-nums">{list.length}</span>
                </h2>
                <ul
                  aria-label={`${col.name}, ${list.length} task${list.length === 1 ? "" : "s"}`}
                  className={`flex flex-1 flex-col gap-2 rounded-lg transition-colors duration-150 ${over === col.status ? "bg-panel-2 outline-2 outline-offset-4 outline-line-strong" : ""}`}
                >
                  {list.map((t) => (
                    <TaskCard key={t.id} t={t} onMove={(to) => setTaskStatus(t, to)} onEdit={() => setEditing(t)} />
                  ))}
                  {list.length === 0 && <li className="flex-1 rounded-lg border border-dashed border-line p-3 text-sm text-muted">{col.hint}</li>}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
      {editing && (
        <EditTask
          t={editing}
          members={members}
          onClose={() => setEditing(null)}
          onSave={(fields) =>
            start(async () => {
              setEditing(null);
              report(await updateTask(hackathonId, editing.id, fields), `${fields.title ?? editing.title} saved.`);
            })
          }
          onDelete={() =>
            start(async () => {
              setEditing(null);
              report(await deleteTask(hackathonId, editing.id), `${editing.title} removed.`);
            })
          }
        />
      )}
    </div>
  );
}

function TaskCard({ t, onMove, onEdit }: { t: TaskDto; onMove: (to: TaskStatus) => void; onEdit: () => void }) {
  const done = t.status === "done";
  const overdue = !done && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
  const urgent = !done && t.dueAt && isUrgent(t.dueAt);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG, t.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="relative flex cursor-grab flex-col gap-2 rounded-lg border border-line bg-panel p-3 transition-colors hover:border-line-strong active:cursor-grabbing"
    >
      <button onClick={onEdit} draggable={false} className={`text-left text-[15px] leading-snug font-semibold hover:underline ${done ? "text-muted line-through decoration-1" : ""}`}>
        {t.title}
        <span className="sr-only">, edit</span>
      </button>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        {t.assignee ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="grid size-6 place-items-center rounded-full bg-rail font-display text-xs font-bold text-rail-strong" aria-hidden>
              {initials(t.assignee.name)}
            </span>
            {t.assignee.name.split(" ")[0]}
          </span>
        ) : (
          <span className="text-muted">Unassigned</span>
        )}
        {t.dueAt && (
          <span suppressHydrationWarning className={urgent ? "font-semibold text-live-text" : overdue ? "inline-flex items-center gap-1 font-semibold" : "text-muted"}>
            {overdue && <Icon name="warning-circle" size={13} />}
            {overdue ? "Overdue · " : "Due "}
            {shortDate(t.dueAt)}
          </span>
        )}
        <Menu
          id={t.id}
          label={<>Move <Icon name="caret-down" size={14} /></>}
          ariaLabel={`Move ${t.title}`}
          heading="Move to"
          buttonClass="ml-auto min-h-8 text-muted hover:bg-panel-2 hover:text-text"
          items={COLS.filter((c) => c.status !== t.status).map((c) => ({ key: c.status, label: c.name, onSelect: () => onMove(c.status) }))}
        />
      </div>
    </li>
  );
}

function AddTask({ hackathonId, members, onDone }: { hackathonId: string; members: MemberDto[]; onDone: (r: { error?: string }, ok: string) => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={form}
      aria-label="Add a task"
      className="flex flex-wrap items-end gap-x-3 gap-y-2"
      action={(fd) =>
        start(async () => {
          const title = String(fd.get("title")).trim();
          const r = await addTask(hackathonId, { title, assigneeId: String(fd.get("assignee")) || null, due: String(fd.get("due")) || null });
          if (!r.error) form.current?.reset();
          onDone(r, `${title} added.`);
        })
      }
    >
      <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-muted">
        New task
        <input name="title" required maxLength={200} placeholder="e.g. Record the demo video" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Assignee
        <select name="assignee" className={field}>
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Due (MYT)
        <input name="due" type="date" className={field} />
      </label>
      <button disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line-strong bg-panel px-3.5 text-sm font-semibold transition-colors hover:bg-text hover:text-ground disabled:opacity-50">
        <Icon name="plus" size={15} /> {pending ? "Adding" : "Add task"}
      </button>
    </form>
  );
}

function EditTask({
  t, members, onClose, onSave, onDelete,
}: {
  t: TaskDto; members: MemberDto[]; onClose: () => void; onSave: (f: TaskFields) => void; onDelete: () => void;
}) {
  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      aria-labelledby="edit-h"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[10px] border border-line bg-panel p-5 text-text backdrop:bg-rail/60"
    >
      <h2 id="edit-h" className="font-display text-2xl font-bold">Edit task</h2>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const next: TaskFields = {};
          const title = String(fd.get("title")).trim();
          const assigneeId = String(fd.get("assignee")) || null;
          const due = String(fd.get("due"));
          // Send only what changed, so an untouched due date keeps its exact time.
          if (title !== t.title) next.title = title;
          if (assigneeId !== (t.assignee?.id ?? null)) next.assigneeId = assigneeId;
          if (due !== day(t.dueAt)) next.due = due || null;
          if (Object.keys(next).length) onSave(next);
          else onClose();
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input name="title" required maxLength={200} defaultValue={t.title} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Assignee
          <select name="assignee" defaultValue={t.assignee?.id ?? ""} className={field}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Due date (MYT)
          <input name="due" type="date" defaultValue={day(t.dueAt)} className={field} />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onDelete} className="min-h-10 rounded-md px-3 text-sm font-semibold text-muted underline hover:text-text">
            Remove task
          </button>
          <button type="button" onClick={onClose} className="ml-auto min-h-10 rounded-md px-3.5 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-text">
            Cancel
          </button>
          <button className="min-h-10 rounded-md bg-rail px-4 text-sm font-semibold text-gold hover:bg-rail-2">Save</button>
        </div>
      </form>
    </dialog>
  );
}
