import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListPublishedEvents = vi.fn();

vi.mock("@/lib/events/queries", () => ({
  listPublishedEvents: mockListPublishedEvents,
}));

function createPublishedEvent() {
  const now = new Date("2026-05-14T00:00:00Z");

  return {
    id: "event-1",
    name: "AI Hackathon",
    slug: "ai-hackathon",
    description: "Build useful AI products.",
    published: true,
    rankingsPublished: false,
    startDate: now,
    endDate: now,
    registrationStart: now,
    registrationEnd: now,
    submissionStart: now,
    submissionEnd: now,
    reviewStart: now,
    reviewEnd: now,
    tracks: [],
    challenges: [],
    prizes: [],
    scoringCriteria: [],
    customFields: [],
    createdAt: now,
    updatedAt: now,
    phase: "registration",
    landingPage: null,
  };
}

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links the event card to the active landing page when one is active", async () => {
    mockListPublishedEvents.mockResolvedValueOnce([
      {
        ...createPublishedEvent(),
        landingPage: {
          id: "landing-1",
          version: 1,
          styleHint: "科技感",
          isActive: true,
          createdAt: new Date("2026-05-14T00:00:00Z"),
          updatedAt: new Date("2026-05-14T00:00:00Z"),
        },
      },
    ]);

    const { default: Home } = await import("@/app/(app)/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain('<a class="group flex');
    expect(html).toContain('href="/events/ai-hackathon/landing"');
    expect(html).toContain("查看落地页");
  });
});
