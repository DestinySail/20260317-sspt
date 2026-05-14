import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrismaClient = {
  event: {
    findUnique: vi.fn(),
  },
};

const mockCreateEventLandingPage = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrismaClient,
}));

vi.mock("@/lib/auth-guards", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/queries", () => ({
  createEventLandingPage: mockCreateEventLandingPage,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/events/[id]/save-landing", () => {
  it("saves generated HTML as a new inactive landing page version", async () => {
    mockPrismaClient.event.findUnique.mockResolvedValueOnce({
      id: "event-1",
      name: "AI 赛事",
    });
    mockCreateEventLandingPage.mockResolvedValueOnce({
      id: "landing-2",
      version: 2,
      isActive: false,
      styleHint: "简约",
      createdAt: new Date("2026-05-14T10:00:00.000Z"),
    });

    const { POST } = await import("@/app/(app)/api/admin/events/[id]/save-landing/route");
    const request = new Request("http://localhost/api/admin/events/event-1/save-landing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: "<html></html>", styleHint: "简约" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "event-1" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateEventLandingPage).toHaveBeenCalledWith(
      "event-1",
      "简约",
      "<html></html>"
    );
    expect(json).toEqual({
      success: true,
      version: 2,
      landingPage: {
        id: "landing-2",
        version: 2,
        isActive: false,
        styleHint: "简约",
        createdAt: "2026-05-14T10:00:00.000Z",
      },
    });
  });
});
