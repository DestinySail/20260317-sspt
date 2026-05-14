import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EventLandingVersions } from "@/components/events/event-landing-versions";

describe("EventLandingVersions", () => {
  it("shows saved landing page versions and an activation control for inactive versions", () => {
    const html = renderToStaticMarkup(
      <EventLandingVersions
        eventSlug="ai-hackathon"
        landingPages={[
          {
            id: "landing-2",
            version: 2,
            isActive: false,
            styleHint: "科技感",
            createdAt: new Date("2026-05-14T00:00:00Z"),
            updatedAt: new Date("2026-05-14T00:00:00Z"),
          },
          {
            id: "landing-1",
            version: 1,
            isActive: true,
            styleHint: "简约",
            createdAt: new Date("2026-05-13T00:00:00Z"),
            updatedAt: new Date("2026-05-13T00:00:00Z"),
          },
        ]}
        activateAction={vi.fn()}
      />
    );

    expect(html).toContain("落地页版本");
    expect(html).toContain("Version 2");
    expect(html).toContain("科技感");
    expect(html).toContain("当前激活");
    expect(html).toContain('name="landingPageId"');
    expect(html).toContain('value="landing-2"');
    expect(html).toContain("激活");
  });
});
