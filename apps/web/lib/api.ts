import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session-cookie";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

export { SESSION_COOKIE };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Server-side call to the HackOps API, as the signed-in member. Always fresh: every screen shows live deadlines.
 * A 401 (no session, or it expired) goes to the sign-in page. Callers that catch errors must let that through
 * with `unstable_rethrow(e)` first.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }), ...init?.headers },
    });
  } catch {
    throw new ApiError(503, "The HackOps API isn't reachable. Start it with pnpm dev from the repo root.");
  }
  // A wrong password on sign-in or password change is a message for the form, not a lost session.
  if (res.status === 401 && path !== "/auth/login" && path !== "/auth/password") redirect("/login");
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(res.status, body?.message ?? `The API answered ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
