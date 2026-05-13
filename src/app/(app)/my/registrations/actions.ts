"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { ActionResultError, safeActionWithSchema } from "@/lib/action-result";
import { canRegisterForEvent } from "@/lib/events/phase";
import { getPrismaClient } from "@/lib/prisma";
import {
  canTransition,
  getRegistrationStatusLabel,
} from "@/lib/registration-status";
import {
  parseRegistrationCustomFields,
  registrationActionSchema,
  registrationFormSchema,
  validateRegistrationAnswers,
  type RegistrationActionInput,
  type RegistrationFormInput,
} from "@/lib/registrations/schema";

export async function createRegistration(input: RegistrationFormInput) {
  return safeActionWithSchema(registrationFormSchema, input, async (payload) => {
    const session = await requireUserAction();
    const prisma = getPrismaClient();
    const event = await prisma.event.findUnique({
      where: { id: payload.eventId },
      select: {
        id: true,
        slug: true,
        published: true,
        registrationStart: true,
        registrationEnd: true,
        customFields: true,
      },
    });

    if (!event || !event.published) {
      throw new ActionResultError("NOT_FOUND", "赛事不存在或尚未发布。");
    }

    if (!canRegisterForEvent(event)) {
      throw new ActionResultError("CONFLICT", "当前不在报名时间窗口内。");
    }

    const existingRegistration = await prisma.registration.findUnique({
      where: {
        eventId_userId: {
          eventId: payload.eventId,
          userId: session.user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingRegistration) {
      throw new ActionResultError("CONFLICT", "你已提交过该赛事报名，请前往“我的报名”查看状态。");
    }

    const validation = validateRegistrationAnswers(
      parseRegistrationCustomFields(event.customFields),
      payload.answers
    );

    if (!validation.success) {
      throw new ActionResultError(
        "VALIDATION_ERROR",
        "提交数据校验失败。",
        validation.fieldErrors
      );
    }

    let registration;

    try {
      registration = await prisma.registration.create({
        data: {
          eventId: event.id,
          userId: session.user.id,
          teamName: payload.teamName.trim() || null,
          answers: validation.answers,
        },
        select: {
          id: true,
          status: true,
        },
      });
    } catch (error) {
      if (isDuplicateRegistrationError(error)) {
        throw new ActionResultError(
          "CONFLICT",
          "你已提交过该赛事报名，请前往“我的报名”查看状态。"
        );
      }

      throw error;
    }

    revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/events/${event.slug}/register`);
    revalidatePath("/my/registrations");
    revalidatePath(`/admin/events/${event.id}/registrations`);

    return registration;
  });
}

export async function confirmRegistration(input: RegistrationActionInput) {
  return updateSelfRegistrationStatus(input, "CONFIRMED", "当前状态暂时不能确认参赛。");
}

export async function cancelRegistration(input: RegistrationActionInput) {
  return updateSelfRegistrationStatus(input, "CANCELLED", "当前状态暂时不能取消报名。");
}

async function updateSelfRegistrationStatus(
  input: RegistrationActionInput,
  nextStatus: "CONFIRMED" | "CANCELLED",
  conflictMessage: string
) {
  return safeActionWithSchema(registrationActionSchema, input, async ({ registrationId }) => {
    const session = await requireUserAction();
    const prisma = getPrismaClient();
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        status: true,
        event: {
          select: {
            id: true,
            slug: true,
          },
        },
        userId: true,
      },
    });

    if (!registration || registration.userId !== session.user.id) {
      throw new ActionResultError("NOT_FOUND", "报名记录不存在或无权操作。");
    }

    if (!canTransition(registration.status, nextStatus)) {
      throw new ActionResultError(
        "CONFLICT",
        `${conflictMessage} 当前状态：${getRegistrationStatusLabel(registration.status)}。`
      );
    }

    const updatedRegistration = await prisma.registration.update({
      where: { id: registrationId },
      data: { status: nextStatus },
      select: {
        id: true,
        status: true,
      },
    });

    revalidatePath("/my/registrations");
    revalidatePath(`/events/${registration.event.slug}`);
    revalidatePath(`/events/${registration.event.slug}/register`);
    revalidatePath(`/admin/events/${registration.event.id}/registrations`);

    return updatedRegistration;
  });
}

async function requireUserAction() {
  const session = await auth();

  if (!session?.user) {
    throw new ActionResultError("UNAUTHORIZED", "请先登录后再继续报名操作。");
  }

  return session;
}

function isDuplicateRegistrationError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
