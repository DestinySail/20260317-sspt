import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma client
const mockPrismaClient = {
  eventLandingPage: {
    findMany: vi.fn(),
  },
};

// Mock the prisma module
vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrismaClient,
}));

// Mock auth guard
vi.mock("@/lib/auth-guards", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/events/[id]/landing-pages", () => {
  it("returns landing pages ordered by version desc", async () => {
    const mockPages = [
      {
        id: "page-2",
        eventId: "event-1",
        version: 2,
        isActive: false,
        styleHint: "科技感",
        content: "<html>v2</html>",
        createdAt: new Date("2026-05-10"),
        updatedAt: new Date("2026-05-10"),
      },
      {
        id: "page-1",
        eventId: "event-1",
        version: 1,
        isActive: true,
        styleHint: "简约",
        content: "<html>v1</html>",
        createdAt: new Date("2026-05-09"),
        updatedAt: new Date("2026-05-09"),
      },
    ];

    mockPrismaClient.eventLandingPage.findMany.mockResolvedValue(mockPages);

    const { GET } = await import("@/app/(app)/api/admin/events/[id]/landing-pages/route");
    const request = new Request("http://localhost/api/admin/events/event-1/landing-pages");
    const params = Promise.resolve({ id: "event-1" });

    const response = await GET(request, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pages).toHaveLength(2);
    expect(json.pages[0].version).toBe(2);
    expect(json.pages[0].isActive).toBe(false);
    expect(json.pages[1].version).toBe(1);
    expect(json.pages[1].isActive).toBe(true);
  });

  it("returns empty array when no landing pages exist", async () => {
    mockPrismaClient.eventLandingPage.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/(app)/api/admin/events/[id]/landing-pages/route");
    const request = new Request("http://localhost/api/admin/events/event-1/landing-pages");
    const params = Promise.resolve({ id: "event-1" });

    const response = await GET(request, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pages).toHaveLength(0);
  });
});

describe("POST /api/admin/events/[id]/activate-landing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when landingPageId is missing", async () => {
    const { POST } = await import("@/app/(app)/api/admin/events/[id]/activate-landing/route");
    const request = new Request("http://localhost/api/admin/events/event-1/activate-landing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("请提供落地页 ID");
  });
});