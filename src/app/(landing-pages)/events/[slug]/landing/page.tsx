import { notFound } from "next/navigation";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { getEventLandingPageBySlug } from "@/lib/ai/queries";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [event, landingPageData] = await Promise.all([
    getPublishedEventBySlug(slug),
    getEventLandingPageBySlug(slug),
  ]);

  if (!event || !landingPageData) {
    notFound();
  }

  const html = landingPageData.content;

  return (
    <iframe
      srcDoc={html}
      className="h-screen w-full border-0"
      title={`${event.name} - 赛事落地页`}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
