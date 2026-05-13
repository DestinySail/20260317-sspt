"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ActionResultError, safeActionWithSchema } from "@/lib/action-result";
import { canReviewEvent } from "@/lib/events/phase";
import { parseEventJsonFields } from "@/lib/events/schema";
import { getPrismaClient } from "@/lib/prisma";
import {
  judgeScoreInputSchema,
  validateJudgeScoreEntries,
  type JudgeScoreActionInput,
} from "@/lib/reviews/schema";

export async function upsertProjectScore(input: JudgeScoreActionInput) {
  return safeActionWithSchema(judgeScoreInputSchema, input, async (payload) => {
    const session = await requireJudgeAction();
    const prisma = getPrismaClient();
    const [event, assignment, project] = await Promise.all([
      prisma.event.findUnique({
        where: { id: payload.eventId },
        select: {
          id: true,
          slug: true,
          published: true,
          reviewStart: true,
          reviewEnd: true,
          scoringCriteria: true,
        },
      }),
      prisma.eventJudge.findUnique({
        where: {
          eventId_userId: {
            eventId: payload.eventId,
            userId: session.user.id,
          },
        },
        select: {
          eventId: true,
        },
      }),
      prisma.project.findFirst({
        where: {
          id: payload.projectId,
          eventId: payload.eventId,
          status: "FINAL",
        },
        select: {
          id: true,
          eventId: true,
        },
      }),
    ]);

    if (!event || !event.published) {
      throw new ActionResultError("NOT_FOUND", "赛事不存在或尚未发布。");
    }

    if (!assignment) {
      throw new ActionResultError("FORBIDDEN", "你未被分配为该赛事评委。");
    }

    if (!project) {
      throw new ActionResultError("NOT_FOUND", "作品不存在，或当前尚未提交终稿。");
    }

    if (!canReviewEvent(event)) {
      throw new ActionResultError("CONFLICT", "当前不在评审时间窗口内，暂不可提交评分。");
    }

    const validation = validateJudgeScoreEntries(
      parseEventJsonFields({
        tracks: [],
        challenges: [],
        prizes: [],
        scoringCriteria: event.scoringCriteria,
        customFields: [],
      }).scoringCriteria,
      payload.scores
    );

    if (!validation.success) {
      throw new ActionResultError(
        "VALIDATION_ERROR",
        validation.fieldErrors.scores?.[0] ?? "评分数据校验失败。",
        validation.fieldErrors
      );
    }

    const score = await prisma.projectScore.upsert({
      where: {
        projectId_judgeId: {
          projectId: project.id,
          judgeId: session.user.id,
        },
      },
      create: {
        eventId: event.id,
        projectId: project.id,
        judgeId: session.user.id,
        scores: validation.data,
        comment: payload.comment.trim() || null,
      },
      update: {
        scores: validation.data,
        comment: payload.comment.trim() || null,
      },
      select: {
        id: true,
      },
    });

    revalidatePath("/judge");
    revalidatePath(`/judge/events/${event.id}`);
    revalidatePath(`/admin/events/${event.id}/judging`);
    revalidatePath(`/admin/events/${event.id}/projects`);

    if (event.slug) {
      revalidatePath(`/events/${event.slug}`);
    }

    return score;
  });
}

async function requireJudgeAction() {
  const session = await auth();

  if (!session?.user) {
    throw new ActionResultError("UNAUTHORIZED", "请先登录后再继续评分。");
  }

  return session;
}
