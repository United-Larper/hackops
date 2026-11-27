"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { HackathonResult, MemberInput, PrizeTrack, ProjectInput, SessionDto, Stage, TeamInput, TwoStepSetupDto } from "@hackops/shared";
import { cookies, headers } from "next/headers";
import { api, ApiError, SESSION_COOKIE } from "@/lib/api";

export type MoveResult = { error?: string };

/**
 * Move a card through POST /hackathons/:id/stage so the stage side effects run (task template, result rule, activity).
 * A Decide note (register or skip) is also kept as the decision note shown on the workspace overview.
 */
export async function moveCard(id: string, stage: Stage, opts: { result?: HackathonResult; note?: string } = {}): Promise<MoveResult> {
  const path = `/hackathons/${encodeURIComponent(id)}`;
  const note = opts.note?.trim() || undefined;
  try {
    // On a move to Registered or Skipped the API also keeps the note as the decision note, in the same transaction.
    await api(`${path}/stage`, { method: "POST", body: JSON.stringify({ stage, result: opts.result, note }) });
  } catch (e) {
    unstable_rethrow(e); // let the sign-in redirect through
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
    unstable_rethrow(e); // let the sign-in redirect through
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

export type Assignment = { memberId: string; role: "lead" | "developer" | "designer" | "pitch" };

/** Replace the hackathon's team. The API makes whoever saves it accountable: its owner on the board and the header. */
export async function saveTeam(id: string, team: Assignment[]) {
  return write(() => api(`${hack(id)}/team`, { method: "PUT", body: JSON.stringify(team) }), "The team didn't save.");
}

/** The note is written as the signed-in member. */
export async function addNote(id: string, text: string) {
  return write(() => api(`${hack(id)}/notes`, { method: "POST", body: JSON.stringify({ text }) }), "The note didn't save.");
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

/** Update a member. Members are added and removed only in the database (pnpm --filter api add-member). */
export async function saveMember(id: string, fields: MemberInput): Promise<MoveResult> {
  return write(() => api(`/members/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(fields) }), "The member didn't save.");
}

/** Create or update a project; a new project opens on its own page. */
export async function saveProject(id: string | null, fields: ProjectInput): Promise<MoveResult> {
  let created: string | undefined;
  const r = await write(async () => {
    const body = JSON.stringify(fields);
    if (id) await api(`/projects/${encodeURIComponent(id)}`, { method: "PATCH", body });
    else created = (await api<{ id: string }>("/projects", { method: "POST", body })).id;
  }, "The project didn't save.");
  if (created) redirect(`/projects/${created}`);
  return r;
}

/** Remove a project; the hackathons it was entered in keep their results and lose the link. */
export async function removeProject(id: string): Promise<MoveResult> {
  const r = await write(() => api(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" }), "The project wasn't removed.");
  if (!r.error) redirect("/projects");
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

/** Save the team profile (Settings). PUT replaces the whole row, so the form sends every field. */
export async function saveTeamProfile(fields: TeamInput): Promise<MoveResult> {
  return write(() => api("/team", { method: "PUT", body: JSON.stringify(fields) }), "The team profile didn't save.");
}

/** Make a new secret for your own bookmarklet and calendar link; old ones stop working. */
export async function newFillToken(): Promise<MoveResult> {
  return write(() => api("/auth/fill-token", { method: "POST" }), "The bookmarklet wasn't made.");
}

/** Replace the hackathon's prize tracks (typed, edited, entering marks). */
export async function saveTracks(id: string, tracks: PrizeTrack[]) {
  const prizeTracks = tracks.map(({ name, sponsor, prize, description, entering }) => ({ name, sponsor, prize, description, entering }));
  return write(() => api(hack(id), { method: "PATCH", body: JSON.stringify({ prizeTracks }) }), "The prize tracks didn't save.");
}

/** Add the event's prize tracks from its Devpost page. */
export async function importTracks(id: string) {
  return write(() => api(`${hack(id)}/tracks/import`, { method: "POST" }), "Couldn't import from Devpost.");
}

/** Re-render the page, which runs the pre-submission check again. */
export async function recheck() {
  refresh();
}

/**
 * Only a path inside this app: `/board`, never `//evil.example` or a full URL. Parsed the way the browser will parse
 * it, so tabs, newlines and backslashes (`/\t/evil.example`) can't turn it into another site.
 */
const safeNext = (next: unknown) => {
  if (typeof next !== "string") return "/board";
  try {
    const u = new URL(next, "http://x");
    return u.origin === "http://x" ? u.pathname + u.search : "/board";
  } catch {
    return "/board";
  }
};

export type LoginState = MoveResult & { needCode?: boolean };

/**
 * Sign in: the API checks the password, then the authenticator code if the member turned two-step on.
 * The session token lives only in an httpOnly cookie.
 */
export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  let session: SessionDto;
  try {
    // The API also limits failed sign-ins per browser address. The last x-forwarded-for entry is the one the nearest
    // proxy added (Next adds the socket address when there's none); earlier entries are whatever the browser sent.
    // CLIENT_ADDRESS_HEADER names a header the host sets itself instead (README, Hosting on Render); never one a browser can send.
    const h = await headers();
    const named = process.env.CLIENT_ADDRESS_HEADER;
    const address = (named ? h.get(named) : h.get("x-forwarded-for")?.split(",").at(-1))?.trim() ?? "";
    const code = String(fd.get("code") ?? "").trim() || undefined;
    session = await api<SessionDto>("/auth/login", {
      method: "POST",
      headers: { "x-client-address": address },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password"), code }),
    });
  } catch (e) {
    if (!(e instanceof ApiError)) return { error: "Couldn't sign in." };
    return { error: e.message, needCode: e.code === "two_step" };
  }
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.SITE_URL ?? "").startsWith("https:"),
    path: "/",
    expires: new Date(session.expiresAt),
  });
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch (e) {
    unstable_rethrow(e); // already signed out: fine
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/** Change your own password; your other sessions are signed out. */
export async function changePassword(_: MoveResult & { done?: boolean }, fd: FormData): Promise<MoveResult & { done?: boolean }> {
  const next = String(fd.get("next") ?? "");
  if (next.length < 10) return { error: "Use at least 10 characters for the new password." };
  if (next !== fd.get("confirm")) return { error: "The new passwords don't match." };
  try {
    await api("/auth/password", { method: "POST", body: JSON.stringify({ current: fd.get("current"), next }) });
  } catch (e) {
    unstable_rethrow(e);
    return { error: e instanceof ApiError ? e.message : "The password didn't change." };
  }
  return { done: true };
}

/** A fresh authenticator key to show; nothing is saved until a code from it comes back. */
export async function startTwoStep(): Promise<MoveResult & Partial<TwoStepSetupDto>> {
  try {
    return await api<TwoStepSetupDto>("/auth/two-step/setup", { method: "POST" });
  } catch (e) {
    unstable_rethrow(e);
    return { error: e instanceof ApiError ? e.message : "Couldn't make a key." };
  }
}

/** Turn two-step sign-in on (with `secret`) or off (without): both need your password and a current code. */
export async function setTwoStep(_: MoveResult, fd: FormData): Promise<MoveResult> {
  const secret = fd.get("secret") ? String(fd.get("secret")) : undefined;
  return write(
    () => api(secret ? "/auth/two-step" : "/auth/two-step/off", { method: "POST", body: JSON.stringify({ password: fd.get("password"), code: fd.get("code"), secret }) }),
    "Two-step sign-in didn't change.",
  );
}
