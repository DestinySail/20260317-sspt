import { getPrismaClient } from "@/lib/prisma";

export async function getEventLandingPageById(id: string) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findUnique({
    where: { id },
  });
}

export async function getEventLandingPageBySlug(slug: string) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findFirst({
    where: {
      event: { slug, published: true },
      isActive: true,
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
  // Get the latest active landing page for an event
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findFirst({
    where: { eventId, isActive: true },
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

export async function createEventLandingPage(
  eventId: string,
  styleHint: string,
  content: string
) {
  const prisma = getPrismaClient();

  // Find the max version for this event
  const existingPages = await prisma.eventLandingPage.findMany({
    where: { eventId },
    select: { version: true },
    orderBy: { version: "desc" },
  });

  const maxVersion = existingPages.length > 0 ? existingPages[0].version : 0;
  const newVersion = maxVersion + 1;

  return prisma.eventLandingPage.create({
    data: {
      eventId,
      version: newVersion,
      isActive: false,
      styleHint,
      content,
    },
  });
}

export async function getEventLandingPages(eventId: string) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findMany({
    where: { eventId },
    orderBy: { version: "desc" },
  });
}

export async function activateLandingPage(landingPageId: string) {
  const prisma = getPrismaClient();

  // Find the landing page to get its eventId
  const landingPage = await prisma.eventLandingPage.findUnique({
    where: { id: landingPageId },
  });

  if (!landingPage) {
    throw new Error("落地页不存在");
  }

  // Deactivate all other pages for this event
  await prisma.eventLandingPage.updateMany({
    where: {
      eventId: landingPage.eventId,
      id: { not: landingPageId },
    },
    data: { isActive: false },
  });

  // Activate the target page
  await prisma.eventLandingPage.update({
    where: { id: landingPageId },
    data: { isActive: true },
  });

  return { success: true };
}

export async function getActiveEventLandingPage(eventId: string) {
  const prisma = getPrismaClient();
  return prisma.eventLandingPage.findFirst({
    where: { eventId, isActive: true },
  });
}
