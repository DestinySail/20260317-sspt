"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { ActionResultError, safeActionWithSchema } from "@/lib/action-result";
import { getEventDeletionBlockReason } from "@/lib/events/delete-policy";
import { ensureUniqueEventSlug } from "@/lib/events/slug";
import {
  canTransition,
  getRegistrationStatusLabel,
} from "@/lib/registration-status";
import { registrationStatusUpdateSchema } from "@/lib/registrations/schema";
import {
  areScoringCriteriaEqual,
  eventFormSchema,
  parseEventJsonFields,
  toEventMutationData,
  type EventFormInput,
} from "@/lib/events/schema";
import { getPrismaClient } from "@/lib/prisma";
import { buildProjectRankings } from "@/lib/reviews/ranking";

const updateEventSchema = eventFormSchema.extend({
  eventId: z.string().uuid("赛事 ID 无效。"),
});

const togglePublishSchema = z.object({
  eventId: z.string().uuid("赛事 ID 无效。"),
  published: z.boolean(),
});

const deleteEventSchema = z.object({
  eventId: z.string().uuid("赛事 ID 无效。"),
});

const assignJudgeSchema = z.object({
  eventId: z.string().uuid("赛事 ID 无效。"),
  email: z.string().trim().email("请输入有效邮箱地址。"),
});

const removeJudgeSchema = z.object({
  eventId: z.string().uuid("赛事 ID 无效。"),
  judgeUserId: z.string().trim().min(1, "评委 ID 无效。"),
});

const toggleRankingsPublishSchema = z.object({
  eventId: z.string().uuid("赛事 ID 无效。"),
  rankingsPublished: z.boolean(),
});

export async function createEvent(input: EventFormInput) {
  return safeActionWithSchema(eventFormSchema, input, async (payload) => {
    await requireAdminAction();

    const prisma = getPrismaClient();
    const slug = await ensureUniqueEventSlug(prisma, payload.name);
    const event = await prisma.event.create({
      data: {
        ...toEventMutationData(payload),
        slug,
      },
      select: {
        id: true,
        slug: true,
        published: true,
      },
    });

    revalidatePath("/admin/events");
    revalidatePath("/");

    return event;
  });
}

export async function updateEvent(input: EventFormInput & { eventId: string }) {
  return safeActionWithSchema(updateEventSchema, input, async ({ eventId, ...payload }) => {
    await requireAdminAction();

    const prisma = getPrismaClient();
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
        scoringCriteria: true,
        _count: {
          select: {
            projectScores: true,
          },
        },
      },
    });

    if (!existingEvent) {
      throw new ActionResultError("NOT_FOUND", "赛事不存在或已被删除。");
    }

    const persistedScoringCriteria = parseEventJsonFields({
      tracks: [],
      challenges: [],
      prizes: [],
      scoringCriteria: existingEvent.scoringCriteria,
      customFields: [],
    }).scoringCriteria;

    if (
      existingEvent._count.projectScores > 0 &&
      !areScoringCriteriaEqual(persistedScoringCriteria, payload.scoringCriteria)
    ) {
      throw new ActionResultError(
        "CONFLICT",
        "赛事已有评分记录，已有评分后不可修改评分维度。为避免影响已提交评分和榜单汇总，请先处理已有评分后再调整。"
      );
    }

    const nextSlug = await ensureUniqueEventSlug(prisma, payload.name, existingEvent.id);
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...toEventMutationData(payload),
        slug: nextSlug,
      },
      select: {
        id: true,
        slug: true,
        published: true,
      },
    });

    revalidatePath("/admin/events");
    revalidatePath("/");
    revalidatePath(`/events/${existingEvent.slug}`);
    revalidatePath(`/events/${event.slug}`);

    return event;
  });
}

export async function togglePublish(input: { eventId: string; published: boolean }) {
  return safeActionWithSchema(togglePublishSchema, input, async ({ eventId, published }) => {
    await requireAdminAction();

    const prisma = getPrismaClient();
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { published },
      select: {
        id: true,
        slug: true,
        published: true,
      },
    });

    revalidatePath("/admin/events");
    revalidatePath("/");
    revalidatePath(`/events/${event.slug}`);

    return event;
  });
}

export async function deleteEvent(input: { eventId: string }) {
  return safeActionWithSchema(deleteEventSchema, input, async ({ eventId }) => {
    await requireAdminAction();

    const prisma = getPrismaClient();
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
        published: true,
        _count: {
          select: {
            registrations: true,
            projects: true,
            projectScores: true,
            judges: true,
          },
        },
      },
    });

    if (!event) {
      throw new ActionResultError("NOT_FOUND", "赛事不存在或已被删除。");
    }

    const blockReason = getEventDeletionBlockReason({
      published: event.published,
      registrationsCount: event._count.registrations,
      projectsCount: event._count.projects,
      projectScoresCount: event._count.projectScores,
      judgesCount: event._count.judges,
    });

    if (blockReason) {
      throw new ActionResultError("CONFLICT", blockReason);
    }

    await prisma.event.delete({
      where: { id: eventId },
      select: { id: true },
    });

    revalidatePath("/admin/events");
    revalidatePath("/");
    revalidatePath(`/admin/events/${eventId}/edit`);
    revalidatePath(`/events/${event.slug}`);

    return {
      id: eventId,
    };
  });
}

export async function updateRegistrationStatus(input: {
  eventId: string;
  registrationIds: string[];
  nextStatus: "ACCEPTED" | "REJECTED";
}) {
  return safeActionWithSchema(registrationStatusUpdateSchema, input, async (payload) => {
    await requireAdminAction();

    const prisma = getPrismaClient();
    const event = await prisma.event.findUnique({
      where: { id: payload.eventId },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!event) {
      throw new ActionResultError("NOT_FOUND", "赛事不存在或已被删除。");
    }

    const registrations = await prisma.registration.findMany({
      where: {
        eventId: payload.eventId,
        id: { in: payload.registrationIds },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (registrations.length !== payload.registrationIds.length) {
      throw new ActionResultError("NOT_FOUND", "部分报名记录不存在或已失效，请刷新列表后重试。");
    }

    const invalidRegistration = registrations.find(
      (registration) => !canTransition(registration.status, payload.nextStatus)
    );

    if (invalidRegistration) {
      throw new ActionResultError(
        "CONFLICT",
        `仅待审核报名可执行该操作，当前包含 ${getRegistrationStatusLabel(invalidRegistration.status)} 状态记录。`
      );
    }

    await prisma.$transaction(
      registrations.map((registration) =>
        prisma.registration.update({
          where: { id: registration.id },
          data: { status: payload.nextStatus },
        })
      )
    );

    revalidatePath(`/admin/events/${payload.eventId}/registrations`);
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/my/registrations");

    return {
      updatedCount: registrations.length,
      nextStatus: payload.nextStatus,
    };
  });
}

export async function assignJudgeToEvent(input: { eventId: string; email: string }) {
  return safeActionWithSchema(assignJudgeSchema, input, async ({ eventId, email }) => {
    await requireAdminAction();

    const prisma = getPrismaClient();
    const [event, user] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          slug: true,
        },
      }),
      prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    ]);

    if (!event) {
      throw new ActionResultError("NOT_FOUND", "赛事不存在或已被删除。");
    }

    if (!user) {
      throw new ActionResultError("NOT_FOUND", "未找到该邮箱对应的已登录用户。");
    }

    try {
      const assignment = await prisma.eventJudge.create({
        data: {
          eventId,
          userId: user.id,
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      revalidateJudgingPaths(eventId, event.slug);

      return assignment.user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ActionResultError("CONFLICT", "该用户已被分配为此赛事评委。");
      }

      throw error;
    }
  });
}

export async function removeJudgeFromEvent(input: { eventId: string; judgeUserId: string }) {
  return safeActionWithSchema(removeJudgeSchema, input, async ({ eventId, judgeUserId }) => {
    await requireAdminAction();

    const prisma = getPrismaClient();
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!event) {
      throw new ActionResultError("NOT_FOUND", "赛事不存在或已被删除。");
    }

    const assignment = await prisma.eventJudge.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: judgeUserId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!assignment) {
      throw new ActionResultError("NOT_FOUND", "该评委分配记录不存在。");
    }

    await prisma.$transaction([
      prisma.projectScore.deleteMany({
        where: {
          eventId,
          judgeId: judgeUserId,
        },
      }),
      prisma.eventJudge.delete({
        where: {
          eventId_userId: {
            eventId,
            userId: judgeUserId,
          },
        },
      }),
    ]);

    revalidateJudgingPaths(eventId, event.slug);

    return {
      userId: judgeUserId,
    };
  });
}

export async function toggleRankingsPublish(input: {
  eventId: string;
  rankingsPublished: boolean;
}) {
  return safeActionWithSchema(
    toggleRankingsPublishSchema,
    input,
    async ({ eventId, rankingsPublished }) => {
      await requireAdminAction();

      const prisma = getPrismaClient();
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          slug: true,
          rankingsPublished: true,
          scoringCriteria: true,
        },
      });

      if (!event) {
        throw new ActionResultError("NOT_FOUND", "赛事不存在或已被删除。");
      }

      if (rankingsPublished) {
        const criteria = parseEventJsonFields({
          tracks: [],
          challenges: [],
          prizes: [],
          scoringCriteria: event.scoringCriteria,
          customFields: [],
        }).scoringCriteria;

        const projects = await prisma.project.findMany({
          where: {
            eventId,
            status: "FINAL",
          },
          select: {
            id: true,
            name: true,
            teamName: true,
            track: true,
            scores: {
              select: {
                judgeId: true,
                scores: true,
              },
            },
          },
        });

        const rankings = buildProjectRankings(
          criteria,
          projects.map((project) => ({
            id: project.id,
            name: project.name,
            teamName: project.teamName,
            track: project.track,
            scoreRecords: project.scores,
          }))
        );

        if (rankings.length === 0) {
          throw new ActionResultError("CONFLICT", "至少有一份已评分作品后才能公开排名。");
        }
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: { rankingsPublished },
        select: {
          id: true,
          slug: true,
          rankingsPublished: true,
        },
      });

      revalidateJudgingPaths(eventId, updatedEvent.slug);

      return updatedEvent;
    }
  );
}

async function requireAdminAction() {
  const session = await auth();

  if (!session?.user) {
    throw new ActionResultError("UNAUTHORIZED", "请先登录管理员账号。");
  }

  if (session.user.role !== "ADMIN") {
    throw new ActionResultError("FORBIDDEN", "仅管理员可执行此操作。");
  }

  return session;
}

function revalidateJudgingPaths(eventId: string, slug: string) {
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}/edit`);
  revalidatePath(`/admin/events/${eventId}/judging`);
  revalidatePath("/judge");
  revalidatePath(`/judge/events/${eventId}`);
  revalidatePath(`/events/${slug}`);
  revalidatePath("/my/projects");
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
