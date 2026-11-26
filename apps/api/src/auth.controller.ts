import { randomBytes } from "node:crypto";
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Post, UnauthorizedException } from "@nestjs/common";
import { LoginInput, PasswordInput, type MeDto, type SessionDto } from "@hackops/shared";
import { currentSession, hashPassword, newToken, SESSION_DAYS, sha256, verifyPassword } from "./auth";
import { ZodPipe } from "./common/zod.pipe";
import { PrismaService } from "./prisma.service";

const WRONG = "Email or password is wrong";
/** Failed sign-ins allowed per 15 minutes: per email (guessing one password), per address (trying many emails). */
const MAX_PER_EMAIL = 5;
const MAX_PER_ADDRESS = 30;
const WINDOW_MS = 15 * 60_000;

@Controller("auth")
export class AuthController {
  constructor(private readonly db: PrismaService) {}

  @Post("login")
  /**
   * `x-client-address` is the browser's address, passed on by the web app's sign-in action.
   * ponytail: trusted as sent, which is fine while the API only listens on 127.0.0.1; a hosted API must take it from its proxy instead.
   */
  async login(@Body(new ZodPipe(LoginInput)) body: LoginInput, @Headers("x-client-address") clientAddress?: string): Promise<SessionDto> {
    const now = Date.now();
    const address = (clientAddress ?? "").slice(0, 64) || "unknown";
    const since = new Date(now - WINDOW_MS);
    await this.db.loginFailure.deleteMany({ where: { at: { lt: since } } }); // the window only needs the last 15 minutes
    const [byEmail, byAddress] = await Promise.all([
      this.db.loginFailure.count({ where: { email: body.email, at: { gte: since } } }),
      this.db.loginFailure.count({ where: { address, at: { gte: since } } }),
    ]);
    if (byEmail >= MAX_PER_EMAIL || byAddress >= MAX_PER_ADDRESS) {
      throw new HttpException("Too many tries. Wait 15 minutes, or ask a teammate to run set-password for you.", HttpStatus.TOO_MANY_REQUESTS);
    }
    const member = body.email
      ? await this.db.member.findUnique({ where: { email: body.email }, select: { id: true, name: true, secret: { select: { passwordHash: true } } } })
      : null;
    // Always one scrypt run, so the answer time doesn't tell which emails have accounts.
    const ok = await verifyPassword(body.password, member?.secret?.passwordHash);
    if (!member || !ok) {
      await this.db.loginFailure.create({ data: { email: body.email.slice(0, 200), address } });
      throw new UnauthorizedException(WRONG);
    }
    await this.db.loginFailure.deleteMany({ where: { email: body.email } });

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
