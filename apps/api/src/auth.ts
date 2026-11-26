import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { PrismaService } from "./prisma.service";

// Sign-in rules (phase 12). Every route needs a session except the PUBLIC list below; the web app forwards the
// session token as a bearer header from its httpOnly cookie. Cross-site forms can't set that header, which is
// also what stops other websites writing to the API.

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LEN = 64;

/** `scrypt$<salt>$<hash>`, both base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${(await scryptAsync(password, salt, KEY_LEN)).toString("base64url")}`;
}

/** Hashed with a throwaway salt at start-up, so an unknown email costs the same scrypt run as a wrong password. */
const DUMMY = hashPassword(randomBytes(16).toString("base64url"));

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [kind, salt, hash] = (stored ?? (await DUMMY)).split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = await scryptAsync(password, Buffer.from(salt, "base64url"), want.length);
  return stored != null && timingSafeEqual(got, want);
}

export const newToken = () => randomBytes(32).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url");
export const SESSION_DAYS = 14;

/** Routes anyone may call. Each needs a reason: adding one here makes it reachable without signing in. */
const PUBLIC = new Set([
  "GET /health", // liveness
  "GET /portfolio", // the public portfolio, built from hand-picked fields
  "GET /signup-profile", // the bookmarklet; needs its owner's fill token
  "GET /calendar.ics", // calendar apps can't send cookies; needs its owner's fill token
  "POST /auth/login",
]);

/** Whose bookmarklet and calendar secret this is, or null. The token is random, so an index lookup leaks nothing useful. */
export async function fillTokenOwner(db: PrismaService, token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !/^[\w-]{20,100}$/.test(token)) return null;
  return (await db.memberSecret.findUnique({ where: { fillToken: token }, select: { memberId: true } }))?.memberId ?? null;
}

const als = new AsyncLocalStorage<{ memberId: string; tokenHash: string }>();
/** The signed-in member for this request, or undefined (public routes, cron jobs, the seed). */
export const currentSession = () => als.getStore();

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly db: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split("?")[0].replace(/\/+$/, "") || "/";
    if (PUBLIC.has(`${req.method} ${path}`)) return next();

    const token = /^Bearer ([\w-]{20,200})$/.exec(req.headers.authorization ?? "")?.[1];
    const tokenHash = token ? sha256(token) : null;
    const session = tokenHash ? await this.db.session.findUnique({ where: { tokenHash }, select: { memberId: true, expiresAt: true } }) : null;
    if (!tokenHash || !session || session.expiresAt <= new Date()) {
      if (session) await this.db.session.delete({ where: { tokenHash: tokenHash! } }).catch(() => undefined);
      res.status(401).json({ statusCode: 401, message: "Sign in to continue" });
      return;
    }
    als.run({ memberId: session.memberId, tokenHash: tokenHash }, next);
  }
}
