import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrismaClient = {
  eventLandingPage: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  event: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrismaClient,
}));

describe("createEventLandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new version with version = MAX(existing) + 1", async () => {
    const eventId = "event-123";

    // Mock existing versions: v2 and v1 (desc order - highest first)
    mockPrismaClient.eventLandingPage.findMany.mockResolvedValueOnce([
      { version: 2 },
      { version: 1 },
    ]);
    mockPrismaClient.eventLandingPage.create.mockResolvedValueOnce({
      id: "lp-new",
      eventId,
      version: 3,
      isActive: false,
      styleHint: "简约",
      content: "<html>...</html>",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { createEventLandingPage } = await import("@/lib/ai/queries");
    const result = await createEventLandingPage(eventId, "简约", "<html>...</html>");

    expect(mockPrismaClient.eventLandingPage.findMany).toHaveBeenCalledWith({
      where: { eventId },
      select: { version: true },
      orderBy: { version: "desc" },
    });
    expect(mockPrismaClient.eventLandingPage.create).toHaveBeenCalledWith({
      data: {
        eventId,
        version: 3,
        isActive: false,
        styleHint: "简约",
        content: "<html>...</html>",
      },
    });
    expect(result.version).toBe(3);
    expect(result.isActive).toBe(false);
  });

  it("first version should be 1 when no existing versions", async () => {
    const eventId = "event-new";

    mockPrismaClient.eventLandingPage.findMany.mockResolvedValueOnce([]);
    mockPrismaClient.eventLandingPage.create.mockResolvedValueOnce({
      id: "lp-new",
      eventId,
      version: 1,
      isActive: false,
      styleHint: "科技感",
      content: "<html>...</html>",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { createEventLandingPage } = await import("@/lib/ai/queries");
    const result = await createEventLandingPage(eventId, "科技感", "<html>...</html>");

    expect(mockPrismaClient.eventLandingPage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) })
    );
    expect(result.version).toBe(1);
  });
});

describe("getEventLandingPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all versions ordered by version desc", async () => {
    const eventId = "event-123";
    const mockPages = [
      { id: "lp-3", eventId, version: 3, isActive: false, styleHint: "简约", createdAt: new Date("2026-05-10") },
      { id: "lp-2", eventId, version: 2, isActive: true, styleHint: "活力", createdAt: new Date("2026-05-09") },
      { id: "lp-1", eventId, version: 1, isActive: false, styleHint: "科技感", createdAt: new Date("2026-05-08") },
    ];
    mockPrismaClient.eventLandingPage.findMany.mockResolvedValueOnce(mockPages);

    const { getEventLandingPages } = await import("@/lib/ai/queries");
    const result = await getEventLandingPages(eventId);

    expect(mockPrismaClient.eventLandingPage.findMany).toHaveBeenCalledWith({
      where: { eventId },
      orderBy: { version: "desc" },
    });
    expect(result).toHaveLength(3);
    expect(result[0].version).toBe(3);
    expect(result[1].isActive).toBe(true);
  });

  it("returns empty array when no versions exist", async () => {
    mockPrismaClient.eventLandingPage.findMany.mockResolvedValueOnce([]);

    const { getEventLandingPages } = await import("@/lib/ai/queries");
    const result = await getEventLandingPages("event-empty");

    expect(result).toHaveLength(0);
  });
});

describe("getEventLandingPageById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the selected landing page with its owning event for version preview validation", async () => {
    const landingPageId = "lp-2";
    mockPrismaClient.eventLandingPage.findUnique.mockResolvedValueOnce({
      id: landingPageId,
      eventId: "event-123",
      version: 2,
      isActive: false,
      content: "<html>v2</html>",
      event: {
        id: "event-123",
        name: "AI Hackathon",
        slug: "ai-hackathon",
      },
    });

    const { getEventLandingPageById } = await import("@/lib/ai/queries");
    const result = await getEventLandingPageById(landingPageId);

    expect(mockPrismaClient.eventLandingPage.findUnique).toHaveBeenCalledWith({
      where: { id: landingPageId },
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
    expect(result?.content).toContain("v2");
    expect(result?.event.id).toBe("event-123");
  });
});

describe("activateLandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets isActive=true for target page and isActive=false for all other pages in event", async () => {
    const landingPageId = "lp-3";
    const eventId = "event-123";

    // Mock: find the target page to get its eventId
    mockPrismaClient.eventLandingPage.findUnique.mockResolvedValueOnce({
      id: landingPageId,
      eventId,
      version: 3,
    });

    // Mock: updateMany to deactivate others
    mockPrismaClient.eventLandingPage.updateMany.mockResolvedValueOnce({
      count: 2,
    });

    // Mock: update to activate target
    mockPrismaClient.eventLandingPage.update.mockResolvedValueOnce({});

    const { activateLandingPage } = await import("@/lib/ai/queries");
    const result = await activateLandingPage(landingPageId);

    // Should deactivate all other pages via updateMany, then activate target page
    expect(mockPrismaClient.eventLandingPage.updateMany).toHaveBeenCalledWith({
      where: {
        eventId,
        id: { not: landingPageId },
      },
      data: { isActive: false },
    });
    expect(mockPrismaClient.eventLandingPage.update).toHaveBeenCalledWith({
      where: { id: landingPageId },
      data: { isActive: true },
    });
    expect(result).toEqual({ success: true });
  });

  it("throws when landing page not found", async () => {
    mockPrismaClient.eventLandingPage.findUnique.mockResolvedValueOnce(null);

    const { activateLandingPage } = await import("@/lib/ai/queries");
    await expect(activateLandingPage("nonexistent")).rejects.toThrow("落地页不存在");
  });
});

describe("getActiveEventLandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the active landing page for an event", async () => {
    const eventId = "event-123";
    const mockPage = {
      id: "lp-2",
      eventId,
      version: 2,
      isActive: true,
      styleHint: "活力",
      content: "<html>active</html>",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrismaClient.eventLandingPage.findFirst.mockResolvedValueOnce(mockPage);

    const { getActiveEventLandingPage } = await import("@/lib/ai/queries");
    const result = await getActiveEventLandingPage(eventId);

    expect(mockPrismaClient.eventLandingPage.findFirst).toHaveBeenCalledWith({
      where: { eventId, isActive: true },
    });
    expect(result).toBeDefined();
    expect(result?.version).toBe(2);
    expect(result?.isActive).toBe(true);
  });

  it("returns null when no active landing page", async () => {
    mockPrismaClient.eventLandingPage.findFirst.mockResolvedValueOnce(null);

    const { getActiveEventLandingPage } = await import("@/lib/ai/queries");
    const result = await getActiveEventLandingPage("event-no-active");

    expect(result).toBeNull();
  });
});
