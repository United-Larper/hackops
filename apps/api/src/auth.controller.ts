import { randomBytes } from "node:crypto";
import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, HttpCode, HttpException, HttpStatus, Post, UnauthorizedException } from "@nestjs/common";
import { LoginInput, PasswordInput, TwoStepInput, type MeDto, type SessionDto, type TwoStepSetupDto } from "@hackops/shared";
import { currentSession, hashPassword, newToken, newTotpSecret, SESSION_DAYS, sha256, totpStep, verifyPassword } from "./auth";
import { ZodPipe } from "./common/zod.pipe";
import { PrismaService } from "./prisma.service";

const WRONG = "Email or password is wrong";
/** Failed tries allowed per 15 minutes: per account (guessing one password or code), per address (trying many emails). */
const MAX_PER_EMAIL = 5;
const MAX_PER_ADDRESS = 30;
const WINDOW_MS = 15 * 60_000;

@Controller("auth")
export class AuthController {
  constructor(private readonly db: PrismaService) {}

  /** 429 once an account or an address has used up its tries. Every password or code check goes through this first. */
  private async guard(email: string, address: string) {
    const since = new Date(Date.now() - WINDOW_MS);
    await this.db.loginFailure.deleteMany({ where: { at: { lt: since } } }); // the window only needs the last 15 minutes
    const [byEmail, byAddress] = await Promise.all([
      this.db.loginFailure.count({ where: { email, at: { gte: since } } }),
      this.db.loginFailure.count({ where: { address, at: { gte: since } } }),
    ]);
    if (byEmail >= MAX_PER_EMAIL || byAddress >= MAX_PER_ADDRESS) {
      throw new HttpException("Too many tries. Wait 15 minutes, or ask a teammate to run set-password for you.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private fail(email: string, address: string) {
    return this.db.loginFailure.create({ data: { email: email.slice(0, 200), address } });
  }

  /**
   * Marks a code's step as used, so the same code can't sign in twice. False if it was already used, or a later one was.
   */
  private async spend(memberId: string, step: number) {
    const { count } = await this.db.memberSecret.updateMany({
      where: { memberId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data: { totpLastStep: step },
    });
    return count === 1;
  }

  @Post("login")
  /**
   * `x-client-address` is the browser's address, passed on by the web app's sign-in action.
   * ponytail: trusted as sent; only the web app can reach the API (it listens on 127.0.0.1), so keep it that way when hosting.
   */
  async login(@Body(new ZodPipe(LoginInput)) body: LoginInput, @Headers("x-client-address") clientAddress?: string): Promise<SessionDto> {
    const address = (clientAddress ?? "").slice(0, 64) || "unknown";
    await this.guard(body.email, address);
    const member = body.email
      ? await this.db.member.findUnique({
          where: { email: body.email },
          select: { id: true, name: true, secret: { select: { passwordHash: true, totpSecret: true } } },
        })
      : null;
    // Always one scrypt run, so the answer time doesn't tell which emails have accounts.
    const ok = await verifyPassword(body.password, member?.secret?.passwordHash);
    if (!member || !ok) {
      await this.fail(body.email, address);
      throw new UnauthorizedException(WRONG);
    }
    const totpSecret = member.secret?.totpSecret;
    if (totpSecret) {
      // The right password alone isn't a failed try: ask for the code.
      if (!body.code) throw new UnauthorizedException({ statusCode: 401, message: "Enter the 6-digit code from your authenticator app", code: "two_step" });
      const step = totpStep(totpSecret, body.code);
      if (step === null || !(await this.spend(member.id, step))) {
        await this.fail(body.email, address);
        throw new UnauthorizedException({ statusCode: 401, message: "That code didn't match; enter the newest one", code: "two_step" });
      }
    }
    await this.db.loginFailure.deleteMany({ where: { email: body.email } });

    const token = newToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await this.db.session.create({ data: { tokenHash: sha256(token), memberId: member.id, expiresAt } });
    await this.db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }); // tidy old ones while we're here
    return { token, expiresAt: expiresAt.toISOString(), member: { id: member.id, name: member.name } };
  }

  /**
   * Checks the signed-in member's own password before a change to their sign-in. Counts toward the same lockout as
   * signing in, so a borrowed session can't guess the password. 403, not 401: the session itself is fine.
   */
  private async confirmPassword(password: string) {
    const { memberId } = signedIn();
    const m = await this.db.member.findUniqueOrThrow({ where: { id: memberId }, select: { email: true, secret: true } });
    const email = m.email ?? memberId;
    const address = `member:${memberId}`;
    await this.guard(email, address);
    if (!(await verifyPassword(password, m.secret?.passwordHash))) {
      await this.fail(email, address);
      throw new ForbiddenException("Your current password is wrong");
    }
    return { memberId, email, address, secret: m.secret };
  }

  @Post("logout")
  @HttpCode(204)
  async logout() {
    await this.db.session.deleteMany({ where: { tokenHash: signedIn().tokenHash } });
  }

  @Get("me")
  async me(): Promise<MeDto> {
    const m = await this.db.member.findUniqueOrThrow({
      where: { id: signedIn().memberId },
      select: { id: true, name: true, secret: { select: { fillToken: true, totpSecret: true } } },
    });
    return { id: m.id, name: m.name, fillToken: m.secret?.fillToken ?? null, twoStep: !!m.secret?.totpSecret };
  }

  /** Change your own password. Signs out your other sessions; this one stays. */
  @Post("password")
  @HttpCode(204)
  async password(@Body(new ZodPipe(PasswordInput)) body: PasswordInput) {
    const { memberId } = await this.confirmPassword(body.current);
    const passwordHash = await hashPassword(body.next);
    await this.db.$transaction([
      this.db.memberSecret.upsert({ where: { memberId }, create: { memberId, passwordHash }, update: { passwordHash } }),
      this.db.session.deleteMany({ where: { memberId, tokenHash: { not: signedIn().tokenHash } } }),
    ]);
  }

  /** A fresh key for an authenticator app. Nothing is saved until a code from it comes back to POST /auth/two-step. */
  @Post("two-step/setup")
  async twoStepSetup(): Promise<TwoStepSetupDto> {
    const m = await this.db.member.findUniqueOrThrow({ where: { id: signedIn().memberId }, select: { email: true, name: true } });
    const secret = newTotpSecret();
    const label = encodeURIComponent(`HackOps:${m.email ?? m.name}`);
    return { secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=HackOps` };
  }

  /** Turn two-step sign-in on. Signs out your other sessions, which signed in without a code. */
  @Post("two-step")
  @HttpCode(204)
  async twoStepOn(@Body(new ZodPipe(TwoStepInput)) body: TwoStepInput) {
    if (!body.secret) throw new BadRequestException("Start again: the key is missing");
    const { memberId } = await this.confirmPassword(body.password);
    const step = totpStep(body.secret, body.code);
    if (step === null) throw new BadRequestException("That code didn't match; check the app's clock and enter the newest code");
    await this.db.$transaction([
      this.db.memberSecret.update({ where: { memberId }, data: { totpSecret: body.secret, totpLastStep: step } }),
      this.db.session.deleteMany({ where: { memberId, tokenHash: { not: signedIn().tokenHash } } }),
    ]);
  }

  /** Turn two-step sign-in off: needs your password and a current code. Lost the phone? `set-password` turns it off. */
  @Post("two-step/off")
  @HttpCode(204)
  async twoStepOff(@Body(new ZodPipe(TwoStepInput)) body: TwoStepInput) {
    const { memberId, email, address, secret } = await this.confirmPassword(body.password);
    if (!secret?.totpSecret) return;
    const step = totpStep(secret.totpSecret, body.code);
    if (step === null || !(await this.spend(memberId, step))) {
      await this.fail(email, address);
      throw new ForbiddenException("That code didn't match; enter the newest one");
    }
    await this.db.memberSecret.update({ where: { memberId }, data: { totpSecret: null, totpLastStep: null } });
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
