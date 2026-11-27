import { lookup } from "node:dns/promises";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { Agent } from "undici";
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ACTIVE_STAGES, TASK_TEMPLATE, type CheckItem, type PrizeTrack, type SubmissionCheckDto } from "@hackops/shared";
import { USER_AGENT } from "../discovery/http";
import { tracksOf } from "../mappers";
import { PrismaService } from "../prisma.service";

// Pre-submission check (phase 10). Runs from the Links & submission tab, and hourly on its own for Registered and
// Building hackathons whose submission is due within 6 hours; failures show in the due-soon panel.

const H = 3_600_000;
const README_MIN = 300;
/** "Submit" is the last template task: it can't be done before submitting. */
const CHECKLIST = TASK_TEMPLATE.map((t) => t.title).filter((t) => t !== "Submit");

type Input = {
  project: { repoUrl: string | null; demoUrl: string | null; videoUrl: string | null } | null;
  tasks: { title: string; status: string }[];
  prizeTracks: Pick<PrizeTrack, "entering">[];
};


/** Loopback, private, link-local (cloud metadata), carrier-grade NAT and unique-local ranges: never fetched. */
const PRIVATE = new BlockList();
const inward = (a: { address: string; family: number }) => PRIVATE.check(a.address, a.family === 6 ? "ipv6" : "ipv4");
for (const [net, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16]] as const) {
  PRIVATE.addSubnet(net, bits, "ipv4");
}
// BlockList matches IPv4-mapped IPv6 (::ffff:127.0.0.1) against the IPv4 rules itself.
for (const [net, bits] of [["::", 127], ["fc00::", 7], ["fe80::", 10]] as const) PRIVATE.addSubnet(net, bits, "ipv6");

/**
 * Whether a stored link points into this computer or its network. Demo and video links are typed by people and
 * fetched by the API (and by the hourly job), so without this they could probe the local network.
 * This gives the clear message; `guarded` below enforces it on the connection itself.
 */
export async function pointsInward(url: string): Promise<boolean> {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  const family = isIP(host);
  const addresses = family ? [{ address: host, family }] : await lookup(host, { all: true });
  return addresses.some(inward);
}

/**
 * The DNS lookup the connection itself uses: it refuses private addresses, so a name that answers with a public
 * address for the check and a private one for the fetch (DNS rebinding) still can't reach inside.
 */
export const guardedLookup: LookupFunction = (host, options, done) => {
  lookup(host, { ...options, all: true }).then(
    (all) => {
      if (!all.length || all.some(inward)) return done(Object.assign(new Error(`${host} points at a private address`), { code: "EPRIVATE" }), "", 4);
      if (options.all) return done(null, all as never);
      done(null, all[0].address, all[0].family);
    },
    (e: NodeJS.ErrnoException) => done(e, "", 4),
  );
};
const guarded = new Agent({ connect: { lookup: guardedLookup } });

const request = (url: string, accept = "*/*") =>
  fetch(url, { redirect: "manual", headers: { "user-agent": USER_AGENT, accept }, signal: AbortSignal.timeout(10_000), dispatcher: guarded } as RequestInit);


/** A link "responds" with a 2xx or 3xx. Redirects aren't followed: the 3xx itself counts. */
async function responds(url: string | null | undefined, missing: string): Promise<Pick<CheckItem, "ok" | "detail">> {
  if (!url) return { ok: false, detail: missing };
  try {
    if (await pointsInward(url)) return { ok: false, detail: "Points at a private address; use the public link" };
    const res = await request(url);
    await res.body?.cancel();
    return res.status < 400 ? { ok: true, detail: "Responds" } : { ok: false, detail: `Answered ${res.status}` };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return { ok: false, detail: timedOut ? "Didn't respond within 10 seconds" : "Couldn't connect; check the link" };
  }
}

const GITHUB = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#]|$)/i;

/** Repo public and README over 300 characters, through the GitHub API without a token (60 requests an hour). */
async function github(repoUrl: string | null | undefined): Promise<[Pick<CheckItem, "ok" | "detail">, Pick<CheckItem, "ok" | "detail">]> {
  if (!repoUrl) return [{ ok: false, detail: "No repository link" }, { ok: false, detail: "No repository link" }];
  const m = repoUrl.match(GITHUB);
  if (!m) return [{ ok: null, detail: "Not on GitHub; check it by hand" }, { ok: null, detail: "Not on GitHub; check it by hand" }];
  const api = `https://api.github.com/repos/${m[1]}/${m[2]}`;
  const unknown = (status?: number) => ({
    ok: null,
    detail: status === 403 || status === 429 ? "GitHub's hourly limit was reached; try again later" : "GitHub didn't answer",
  });
  try {
    const repo = await request(api, "application/vnd.github+json");
    if (repo.status === 404) return [{ ok: false, detail: "Not found, or private" }, { ok: false, detail: "Repository not reachable" }];
    if (!repo.ok) return [unknown(repo.status), unknown(repo.status)];
    const isPrivate = ((await repo.json()) as { private?: boolean }).private;
    if (isPrivate) return [{ ok: false, detail: "Private" }, { ok: false, detail: "Repository is private" }];

    const readme = await request(`${api}/readme`, "application/vnd.github.raw+json");
    if (readme.status === 404) return [{ ok: true, detail: "Public" }, { ok: false, detail: "No README" }];
    if (!readme.ok) return [{ ok: true, detail: "Public" }, unknown(readme.status)];
    const length = (await readme.text()).trim().length;
    return [
      { ok: true, detail: "Public" },
      length > README_MIN ? { ok: true, detail: `${length} characters` } : { ok: false, detail: `Only ${length} characters; aim for over ${README_MIN}` },
    ];
  } catch {
    return [unknown(), unknown()];
  }
}

export async function checkSubmission(h: Input): Promise<CheckItem[]> {
  const [[repo, readme], video, demo] = await Promise.all([
    github(h.project?.repoUrl),
    responds(h.project?.videoUrl, "No video link"),
    responds(h.project?.demoUrl, "No demo link"),
  ]);
  const template = h.tasks.filter((t) => CHECKLIST.includes(t.title));
  const left = template.filter((t) => t.status !== "done").map((t) => t.title);
  const entering = h.prizeTracks.filter((t) => t.entering).length;
  return [
    { key: "repo", label: "Repo is public", ...repo },
    { key: "readme", label: "README is not empty", ...readme },
    { key: "video", label: "Demo video linked", ...video },
    { key: "demo", label: "Demo link works", ...demo },
    {
      key: "checklist",
      label: "Checklist done",
      ...(!template.length
        ? { ok: false, detail: "No checklist yet; it's added when the hackathon moves to Registered" }
        : left.length
          ? { ok: false, detail: `${left.length} left: ${left.join(", ")}` }
          : { ok: true, detail: "All done" }),
    },
    {
      key: "tracks",
      label: "Prize tracks chosen",
      ...(entering ? { ok: true, detail: `Entering ${entering}` } : { ok: false, detail: "No track marked as entering" }),
    },
  ];
}


@Injectable()
export class SubmissionCheckService {
  private readonly log = new Logger("SubmissionCheck");
  // ponytail: last result per hackathon in memory, so a restart forgets failures until the next hourly run.
  private readonly failing = new Set<string>();

  constructor(private readonly db: PrismaService) {}

  @Cron("0 * * * *", { name: "submission-check" })
  async hourly(now = new Date()) {
    const due = await this.db.hackathon.findMany({
      where: { stage: { in: [...ACTIVE_STAGES] }, submissionDueAt: { gt: now, lte: new Date(now.getTime() + 6 * H) } },
      select: { id: true },
    });
    for (const { id } of due) await this.run(id).catch((e) => this.log.warn(`${id}: ${e instanceof Error ? e.message : e}`));
  }

  /** Hackathon ids whose last check had a failure. */
  failures(): string[] {
    return [...this.failing];
  }

  async run(id: string): Promise<SubmissionCheckDto> {
    const h = await this.db.hackathon.findUniqueOrThrow({ where: { id }, include: { project: true, tasks: true } });
    const items = await checkSubmission({ project: h.project, tasks: h.tasks, prizeTracks: tracksOf(h.prizeTracks) });
    if (items.some((i) => i.ok === false)) this.failing.add(id);
    else this.failing.delete(id);
    return { checkedAt: new Date().toISOString(), items };
  }
}
