"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { HackathonResult, MemberInput, Stage } from "@hackops/shared";
import { api, ApiError } from "@/lib/api";

export type MoveResult = { error?: string };

/**
 * Move a card through POST /hackathons/:id/stage so the stage side effects run (task template, result rule, activity).
 * A Decide note (register or skip) is also kept as the decision note shown on the workspace overview.
 */
export async function moveCard(id: string, stage: Stage, opts: { result?: HackathonResult; note?: string } = {}): Promise<MoveResult> {
  const path = `/hackathons/${encodeURIComponent(id)}`;
  const note = opts.note?.trim() || undefined;
  try {
    // Note first: if the move then fails, nothing has moved and the error is accurate.
    if (note && (stage === "registered" || stage === "skipped")) {
      await api(path, { method: "PATCH", body: JSON.stringify({ decisionNote: note }) });
    }
    await api(`${path}/stage`, { method: "POST", body: JSON.stringify({ stage, result: opts.result, note }) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "The move didn't save." };
  }
  refresh();
  return {};
}

const hack = (id: string) => `/hackathons/${encodeURIComponent(id)}`;

/** Run API writes and turn a failure into a message. Refreshes either way, so a half-done write still shows what saved. */
async function write(fn: () => Promise<unknown>, failed: string): Promise<MoveResult> {
  try {
    await fn();
    return {};
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : failed };
  } finally {
    refresh();
  }
}

/** A date input's YYYY-MM-DD as the end of that day in Malaysia time, or null when cleared. */
const dueAt = (day: string | null | undefined) => (day ? `${day}T23:59:00+08:00` : null);

export type TaskFields = { title?: string; status?: "todo" | "doing" | "done"; assigneeId?: string | null; due?: string | null };
const taskBody = ({ due, ...rest }: TaskFields) => JSON.stringify({ ...rest, ...(due !== undefined && { dueAt: dueAt(due) }) });

export async function addTask(id: string, fields: TaskFields) {
  return write(() => api(`${hack(id)}/tasks`, { method: "POST", body: taskBody(fields) }), "The task didn't save.");
}

/** Only the fields passed change. */
export async function updateTask(id: string, taskId: string, fields: TaskFields) {
  return write(() => api(`${hack(id)}/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body: taskBody(fields) }), "The task didn't save.");
}

export async function deleteTask(id: string, taskId: string) {
  return write(() => api(`${hack(id)}/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }), "The task wasn't removed.");
}

export type Assignment = { memberId: string; role: "lead" | "developer" | "designer" | "pitch"; accountable: boolean };

/** Replace the hackathon's team; the accountable person becomes its owner (shown on the board and the header). */
export async function saveTeam(id: string, team: Assignment[]) {
  const owner = team.find((a) => a.accountable)?.memberId ?? null;
  return write(async () => {
    await api(`${hack(id)}/team`, { method: "PUT", body: JSON.stringify(team) });
    await api(hack(id), { method: "PATCH", body: JSON.stringify({ ownerId: owner }) });
  }, "The team didn't save.");
}

export async function addNote(id: string, text: string, memberId: string | null) {
  return write(() => api(`${hack(id)}/notes`, { method: "POST", body: JSON.stringify({ text, memberId }) }), "The note didn't save.");
}

export async function linkProject(id: string, projectId: string | null) {
  return write(() => api(hack(id), { method: "PATCH", body: JSON.stringify({ projectId }) }), "The project wasn't linked.");
}

/** Create a project and link it to this hackathon in one go. */
export async function createProject(id: string, name: string, repoUrl: string | null) {
  return write(async () => {
    const p = await api<{ id: string }>("/projects", { method: "POST", body: JSON.stringify({ name, repoUrl }) });
    await api(hack(id), { method: "PATCH", body: JSON.stringify({ projectId: p.id }) });
  }, "The project wasn't created.");
}

export type ProjectLinks = { repoUrl: string | null; demoUrl: string | null; videoUrl: string | null; slidesUrl: string | null; devpostUrl: string | null };

export async function saveProjectLinks(projectId: string, links: ProjectLinks) {
  return write(() => api(`/projects/${encodeURIComponent(projectId)}`, { method: "PATCH", body: JSON.stringify(links) }), "The links didn't save.");
}

/** Create or update a member; a new member opens on their own page. */
export async function saveMember(id: string | null, fields: MemberInput): Promise<MoveResult> {
  let created: string | undefined;
  const r = await write(async () => {
    const body = JSON.stringify(fields);
    if (id) await api(`/members/${encodeURIComponent(id)}`, { method: "PATCH", body });
    else created = (await api<{ id: string }>("/members", { method: "POST", body })).id;
  }, "The member didn't save.");
  if (created) redirect(`/team/${created}`);
  return r;
}

/** Remove a member; their assignments go with them and their tasks become unassigned. */
export async function removeMember(id: string): Promise<MoveResult> {
  const r = await write(() => api(`/members/${encodeURIComponent(id)}`, { method: "DELETE" }), "The member wasn't removed.");
  if (!r.error) redirect("/team");
  return r;
}

export type Retro = { result: HackathonResult | null; resultNote: string | null; retroWentWell: string | null; retroToChange: string | null };

/** Save the retro; a new or changed result moves the hackathon to Results through the stage endpoint. */
export async function saveRetro(id: string, stage: Stage, current: HackathonResult | null, { result, ...text }: Retro) {
  return write(async () => {
    await api(hack(id), { method: "PATCH", body: JSON.stringify(text) });
    if (result && (stage !== "results" || result !== current)) {
      await api(`${hack(id)}/stage`, { method: "POST", body: JSON.stringify({ stage: "results", result }) });
    }
  }, "The retro didn't save.");
}
