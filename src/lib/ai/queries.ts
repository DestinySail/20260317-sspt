import { getPrismaClient } from "@/lib/prisma";

export async function getEventLandingPage(eventId: string) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findUnique({
    where: { eventId },
  });
}

export async function getEventLandingPageBySlug(slug: string) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findFirst({
    where: {
      event: { slug },
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
          registrationStart: true,
          registrationEnd: true,
          published: true,
        },
      },
    },
  });
}

export async function getEventLandingPageByEventId(eventId: string) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findUnique({
    where: { eventId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function upsertEventLandingPage(
  eventId: string,
  styleHint: string,
  content: string
) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.upsert({
    where: { eventId },
    create: {
      eventId,
      styleHint,
      content,
    },
    update: {
      styleHint,
      content,
    },
  });
}
