import { BadRequestException } from "@nestjs/common";
import { templateTasks, type StageInput } from "@hackops/shared";
import type { PrismaService } from "./prisma.service";
import type { Prisma } from "./generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Every change to a hackathon leaves a line in its activity feed, written in the same transaction. */
export function logActivity(tx: Tx, hackathonId: string, text: string, kind: "change" | "note" = "change", memberId?: string | null) {
  return tx.activity.create({ data: { hackathonId, text, kind, memberId: memberId ?? null } });
}

/**
 * Stage change with its side effects (spec §5):
 * - moving to Registered creates the template task list, once;
 * - moving to Results needs a result; leaving Results clears it;
 * - the change and any note go into the activity feed.
 */
export async function changeStage(db: PrismaService, id: string, input: StageInput) {
  if (input.stage === "results" && !input.result) {
    throw new BadRequestException({ message: "Moving to Results needs a result: won, finalist or participated" });
  }
  return db.$transaction(async (tx) => {
    const h = await tx.hackathon.findUniqueOrThrow({ where: { id }, include: { _count: { select: { tasks: true } } } });
    await tx.hackathon.update({
      where: { id },
      data: { stage: input.stage, result: input.stage === "results" ? input.result : null },
    });

    if (input.stage === "registered" && h._count.tasks === 0) {
      await tx.task.createMany({ data: templateTasks(h.submissionDueAt).map((t) => ({ ...t, hackathonId: id })) });
      await logActivity(tx, id, "Standard task list added");
    }

    const resultText = input.stage === "results" ? ` (${input.result})` : "";
    if (h.stage !== input.stage) await logActivity(tx, id, `Stage: ${h.stage} → ${input.stage}${resultText}`);
    if (input.note) await logActivity(tx, id, input.note, "note");
  });
}
