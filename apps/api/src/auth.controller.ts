import { randomBytes } from "node:crypto";
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, UnauthorizedException } from "@nestjs/common";
import { LoginInput, PasswordInput, type MeDto, type SessionDto } from "@hackops/shared";
import { currentSession, hashPassword, newToken, SESSION_DAYS, sha256, verifyPassword } from "./auth";
import { ZodPipe } from "./common/zod.pipe";
import { PrismaService } from "./prisma.service";

const WRONG = "Email or password is wrong";
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

@Controller("auth")
export class AuthController {
  // ponytail: failed sign-ins per email, in memory; fine for one local API process, move to a table if it ever runs as several.
  private readonly failures = new Map<string, number[]>();

  constructor(private readonly db: PrismaService) {}

  @Post("login")
  async login(@Body(new ZodPipe(LoginInput)) body: LoginInput): Promise<SessionDto> {
    const now = Date.now();
    const recent = (this.failures.get(body.email) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_FAILURES) {
      throw new HttpException("Too many tries. Wait 15 minutes, or ask a teammate to run set-password for you.", HttpStatus.TOO_MANY_REQUESTS);
    }
    const member = body.email
      ? await this.db.member.findUnique({ where: { email: body.email }, select: { id: true, name: true, secret: { select: { passwordHash: true } } } })
      : null;
    // Always one scrypt run, so the answer time doesn't tell which emails have accounts.
    const ok = await verifyPassword(body.password, member?.secret?.passwordHash);
    if (!member || !ok) {
      this.failures.set(body.email, [...recent, now]);
      throw new UnauthorizedException(WRONG);
    }
    this.failures.delete(body.email);

    const token = newToken();
    const expiresAt = new Date(now + SESSION_DAYS * 86_400_000);
    await this.db.session.create({ data: { tokenHash: sha256(token), memberId: member.id, expiresAt } });
    await this.db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }); // tidy old ones while we're here
    return { token, expiresAt: expiresAt.toISOString(), member: { id: member.id, name: member.name } };
  }

  @Post("logout")
  @HttpCode(204)
  async logout() {
    await this.db.session.deleteMany({ where: { tokenHash: signedIn().tokenHash } });
  }

  @Get("me")
  async me(): Promise<MeDto> {
    const m = await this.db.member.findUniqueOrThrow({ where: { id: signedIn().memberId }, select: { id: true, name: true, secret: { select: { fillToken: true } } } });
    return { id: m.id, name: m.name, fillToken: m.secret?.fillToken ?? null };
  }

  /** Change your own password. Signs out your other sessions; this one stays. */
  @Post("password")
  @HttpCode(204)
  async password(@Body(new ZodPipe(PasswordInput)) body: PasswordInput) {
    const { memberId, tokenHash } = signedIn();
    const secret = await this.db.memberSecret.findUnique({ where: { memberId } });
    if (!(await verifyPassword(body.current, secret?.passwordHash))) throw new UnauthorizedException("Your current password is wrong");
    const passwordHash = await hashPassword(body.next);
    await this.db.$transaction([
      this.db.memberSecret.upsert({ where: { memberId }, create: { memberId, passwordHash }, update: { passwordHash } }),
      this.db.session.deleteMany({ where: { memberId, tokenHash: { not: tokenHash } } }),
    ]);
  }

  /** A new secret for your own bookmarklet and calendar feed; ones made with the old secret stop working. */
  @Post("fill-token")
  async rotateFillToken(): Promise<MeDto> {
    const { memberId } = signedIn();
    const fillToken = randomBytes(24).toString("base64url");
    await this.db.memberSecret.upsert({ where: { memberId }, create: { memberId, fillToken }, update: { fillToken } });
    return this.me();
  }
}

/** Every route here but login sits behind the auth middleware, so a session is always there. */
function signedIn() {
  const s = currentSession();
  if (!s) throw new UnauthorizedException("Sign in to continue");
  return s;
}
