import { randomBytes } from "node:crypto";
import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, HttpException, HttpStatus, Post, UnauthorizedException } from "@nestjs/common";
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

  /**
   * Every password or code check starts here. The try is recorded as a failure first and counted with itself
   * included, so tries that arrive at once can't all pass before any is saved: of N at once, at most the limit go on.
   * Returns the row's id; `pass()` deletes it when the check succeeds. 429 once an account or address is used up.
   */
  private async attempt(email: string, address: string) {
    const since = new Date(Date.now() - WINDOW_MS);
    await this.db.loginFailure.deleteMany({ where: { at: { lt: since } } }); // the window only needs the last 15 minutes
    const { id } = await this.db.loginFailure.create({ data: { email: email.slice(0, 200), address }, select: { id: true } });
    const [byEmail, byAddress] = await Promise.all([
      this.db.loginFailure.count({ where: { email: email.slice(0, 200), at: { gte: since } } }),
      this.db.loginFailure.count({ where: { address, at: { gte: since } } }),
    ]);
    if (byEmail > MAX_PER_EMAIL || byAddress > MAX_PER_ADDRESS) {
      await this.pass(id); // a refused try isn't a guess
      throw new HttpException("Too many tries. Wait 15 minutes, or ask a teammate to run set-password for you.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return id;
  }

  /** The check behind `attempt(id)` succeeded: it wasn't a failure after all. */
  private pass(id: string) {
    return this.db.loginFailure.deleteMany({ where: { id } });
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
    const attempt = await this.attempt(body.email, address);
    const member = body.email
      ? await this.db.member.findUnique({
          where: { email: body.email },
          select: { id: true, name: true, secret: { select: { passwordHash: true, totpSecret: true } } },
        })
      : null;
    // Always one scrypt run, so the answer time doesn't tell which emails have accounts.
    const ok = await verifyPassword(body.password, member?.secret?.passwordHash);
    if (!member || !ok) throw new UnauthorizedException(WRONG); // the attempt stays as a failure
    const totpSecret = member.secret?.totpSecret;
    if (totpSecret) {
      // The right password alone isn't a failed try: ask for the code.
      if (!body.code) {
        await this.pass(attempt);
        throw new UnauthorizedException({ statusCode: 401, message: "Enter the 6-digit code from your authenticator app", code: "two_step" });
      }
      const step = totpStep(totpSecret, body.code);
      if (step === null || !(await this.spend(member.id, step))) {
        throw new UnauthorizedException({ statusCode: 401, message: "That code didn't match; enter the newest one", code: "two_step" });
      }
    }
    await this.db.loginFailure.deleteMany({ where: { email: body.email.slice(0, 200) } }); // this attempt and earlier ones

    const token = newToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await this.db.session.create({ data: { tokenHash: sha256(token), memberId: member.id, expiresAt } });
    await this.db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }); // tidy old ones while we're here
    return { token, expiresAt: expiresAt.toISOString(), member: { id: member.id, name: member.name } };
  }

  /**
   * Checks the signed-in member's own password before a change to their sign-in. Counts toward the same lockout as
   * signing in, so a borrowed session can't guess the password. 403, not 401: the session itself is fine.
   * The attempt stays recorded until the caller calls `pass(attempt)`, so a code checked after the password counts too.
   */
  private async confirmPassword(password: string) {
    const { memberId } = signedIn();
    const m = await this.db.member.findUniqueOrThrow({ where: { id: memberId }, select: { email: true, secret: true } });
    const attempt = await this.attempt(m.email ?? memberId, `member:${memberId}`);
    if (!(await verifyPassword(password, m.secret?.passwordHash))) throw new ForbiddenException("Your current password is wrong");
    return { memberId, attempt, secret: m.secret };
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
    const { memberId, attempt } = await this.confirmPassword(body.current);
    await this.pass(attempt);
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

  /**
   * Turn two-step sign-in on. Signs out your other sessions, which signed in without a code.
   * Only when it's off: replacing an active key would skip the current code that turning it off asks for.
   */
  @Post("two-step")
  @HttpCode(204)
  async twoStepOn(@Body(new ZodPipe(TwoStepInput)) body: TwoStepInput) {
    if (!body.secret) throw new BadRequestException("Start again: the key is missing");
    const { memberId, attempt, secret } = await this.confirmPassword(body.password);
    await this.pass(attempt);
    if (secret?.totpSecret) throw new ConflictException("Two-step sign-in is already on. Turn it off first to use a new key.");
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
    const { memberId, attempt, secret } = await this.confirmPassword(body.password);
    if (!secret?.totpSecret) return void (await this.pass(attempt));
    const step = totpStep(secret.totpSecret, body.code);
    // A wrong code leaves the attempt recorded as a failure.
    if (step === null || !(await this.spend(memberId, step))) throw new ForbiddenException("That code didn't match; enter the newest one");
    await this.pass(attempt);
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
