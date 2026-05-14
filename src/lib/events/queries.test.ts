import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEventFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getOptionalPrismaClient: () => ({
    event: {
      findMany: mockEventFindMany,
    },
  }),
}));

function createEventRecord() {
  return {
    id: "event-1",
    name: "AI Hackathon",
    slug: "ai-hackathon",
    description: "Build useful AI products.",
    published: true,
    rankingsPublished: false,
    startDate: new Date("2026-05-01T00:00:00Z"),
    endDate: new Date("2026-05-20T00:00:00Z"),
    registrationStart: new Date("2026-05-01T00:00:00Z"),
    registrationEnd: new Date("2026-05-05T00:00:00Z"),
    submissionStart: new Date("2026-05-06T00:00:00Z"),
    submissionEnd: new Date("2026-05-12T00:00:00Z"),
    reviewStart: new Date("2026-05-13T00:00:00Z"),
    reviewEnd: new Date("2026-05-18T00:00:00Z"),
    tracks: [],
    challenges: [],
    prizes: [],
    scoringCriteria: [],
    customFields: [],
    createdAt: new Date("2026-04-01T00:00:00Z"),
    updatedAt: new Date("2026-04-02T00:00:00Z"),
  };
}

describe("event queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes the active landing page on admin event list items", async () => {
    const landingPage = {
      id: "landing-2",
      version: 2,
      styleHint: "warm minimal",
      isActive: true,
      createdAt: new Date("2026-05-10T00:00:00Z"),
      updatedAt: new Date("2026-05-10T00:00:00Z"),
    };
    mockEventFindMany.mockResolvedValueOnce([
      {
        ...createEventRecord(),
        landingPages: [landingPage],
      },
    ]);

    const { listAdminEvents } = await import("@/lib/events/queries");
    const events = await listAdminEvents();

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          landingPages: {
            where: { isActive: true },
            select: {
              id: true,
              version: true,
              styleHint: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { version: "desc" },
            take: 1,
          },
        }),
      })
    );
    expect(events[0].landingPage).toEqual(landingPage);
  });
});
