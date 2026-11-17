import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { WorkspaceDto } from "@hackops/shared";
import { api, ApiError } from "./api";

/** One read per request: the workspace layout and the open tab share it. */
export const getWorkspace = cache(async (id: string) => {
  try {
    return await api<WorkspaceDto>(`/hackathons/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
