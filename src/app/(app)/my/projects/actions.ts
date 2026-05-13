"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { ActionResultError, safeActionWithSchema } from "@/lib/action-result";
import { canSubmitProjectForEvent } from "@/lib/events/phase";
import { getPrismaClient } from "@/lib/prisma";
import {
  parseProjectConfig,
  projectFormSchema,
  validateProjectFormInput,
  type ProjectFormInput,
} from "@/lib/projects/schema";

export async function createProject(input: ProjectFormInput) {
  return safeActionWithSchema(projectFormSchema, input, async (payload) => {
    const session = await requireUserAction();
    const context = await getProjectWriteContext(payload.eventId, session.user.id, payload);

    const existingProject = await context.prisma.project.findUnique({
      where: {
        eventId_submittedBy: {
          eventId: payload.eventId,
          submittedBy: session.user.id,
        },
      },
      select: { id: true },
    });

    if (existingProject) {
      throw new ActionResultError("CONFLICT", "你已创建过该赛事作品，请直接继续编辑。");
    }

    try {
      const project = await context.prisma.project.create({
        data: {
          eventId: context.event.id,
          submittedBy: session.user.id,
          teamName: context.registration.teamName?.trim() || null,
          status: "DRAFT",
          ...context.data,
        },
        select: {
          id: true,
          status: true,
        },
      });

      revalidateProjectPaths(context.event.id, context.event.slug);
      return project;
    } catch (error) {
      if (isDuplicateProjectError(error)) {
        throw new ActionResultError("CONFLICT", "你已创建过该赛事作品，请直接继续编辑。");
      }

      throw error;
    }
  });
}

export async function updateProject(input: ProjectFormInput) {
  return safeActionWithSchema(projectFormSchema, input, async (payload) => {
    const session = await requireUserAction();
    const context = await getProjectWriteContext(payload.eventId, session.user.id, payload);

    const existingProject = await context.prisma.project.findUnique({
      where: {
        eventId_submittedBy: {
          eventId: context.event.id,
          submittedBy: session.user.id,
        },
      },
      select: { id: true },
    });

    if (!existingProject) {
      throw new ActionResultError(
        "NOT_FOUND",
        "还没有保存过作品草稿，请先保存草稿或直接提交终稿。"
      );
    }

    const project = await context.prisma.project.update({
      where: { id: existingProject.id },
      data: {
        teamName: context.registration.teamName?.trim() || null,
        status: "DRAFT",
        ...context.data,
      },
      select: {
        id: true,
        status: true,
      },
    });

    revalidateProjectPaths(context.event.id, context.event.slug);
    return project;
  });
}

export async function submitProject(input: ProjectFormInput) {
  return safeActionWithSchema(projectFormSchema, input, async (payload) => {
    const session = await requireUserAction();
    const context = await getProjectWriteContext(payload.eventId, session.user.id, payload);

    const project = await context.prisma.project.upsert({
      where: {
        eventId_submittedBy: {
          eventId: context.event.id,
          submittedBy: session.user.id,
        },
      },
      create: {
        eventId: context.event.id,
        submittedBy: session.user.id,
        teamName: context.registration.teamName?.trim() || null,
        status: "FINAL",
        ...context.data,
      },
      update: {
        teamName: context.registration.teamName?.trim() || null,
        status: "FINAL",
        ...context.data,
      },
      select: {
        id: true,
        status: true,
      },
    });

    revalidateProjectPaths(context.event.id, context.event.slug);
    return project;
  });
}

async function getProjectWriteContext(
  eventId: string,
  userId: string,
  payload: ProjectFormInput
) {
  const prisma = getPrismaClient();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      slug: true,
      published: true,
      submissionStart: true,
      submissionEnd: true,
      tracks: true,
      challenges: true,
    },
  });

  if (!event || !event.published) {
    throw new ActionResultError("NOT_FOUND", "赛事不存在或尚未发布。");
  }

  if (!canSubmitProjectForEvent(event)) {
    throw new ActionResultError("CONFLICT", "当前不在作品提交时间窗口内。");
  }

  const registration = await prisma.registration.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
    select: {
      id: true,
      status: true,
      teamName: true,
    },
  });

  if (!registration || registration.status !== "CONFIRMED") {
    throw new ActionResultError("FORBIDDEN", "需要先获得报名确认才能提交作品。");
  }

  const config = parseProjectConfig({
    tracks: event.tracks,
    challenges: event.challenges,
  });

  const validation = validateProjectFormInput(
    config,
    payload
  );

  if (!validation.success) {
    throw new ActionResultError("VALIDATION_ERROR", "提交数据校验失败。", validation.fieldErrors);
  }

  return {
    prisma,
    event,
    registration,
    data: validation.data,
  };
}

async function requireUserAction() {
  const session = await auth();

  if (!session?.user) {
    throw new ActionResultError("UNAUTHORIZED", "请先登录后再继续作品提交。");
  }

  return session;
}

function revalidateProjectPaths(eventId: string, slug: string) {
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/events/${slug}/submit`);
  revalidatePath("/my/projects");
  revalidatePath(`/admin/events/${eventId}/projects`);
}

function isDuplicateProjectError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
