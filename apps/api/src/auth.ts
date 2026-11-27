import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
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

// Two-step sign-in: TOTP (RFC 6238, SHA-1, 6 digits, 30 seconds), what every authenticator app speaks.
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 20 random bytes in base32: the key an authenticator app takes. */
export function newTotpSecret(): string {
  let bits = 0, value = 0, out = "";
  for (const byte of randomBytes(20)) {
    value = ((value << 8) | byte) & 0xffff;
    for (bits += 8; bits >= 5; bits -= 5) out += B32[(value >>> (bits - 5)) & 31];
  }
  return out; // 160 bits is a whole number of base32 characters
}

export function totp(secret: string, step: number): string {
  let bits = 0, value = 0;
  const key: number[] = [];
  for (const c of secret) {
    value = ((value << 5) | B32.indexOf(c)) & 0xffff;
    if ((bits += 5) >= 8) key.push((value >>> (bits -= 8)) & 255);
  }
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", Buffer.from(key)).update(msg).digest();
  return String((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** The 30-second step a code belongs to, allowing one step of clock drift either way, or null. */
export function totpStep(secret: string, code: string, now = Date.now()): number | null {
  const t = Math.floor(now / 30_000);
  for (const step of [t - 1, t, t + 1]) if (timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code.padEnd(6).slice(0, 6)))) return step;
  return null;
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
