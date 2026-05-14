import { notFound } from "next/navigation";
import { getPublishedEventBySlug } from "@/lib/events/queries";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [event, landingPageData] = await Promise.all([
    getPublishedEventBySlug(slug),
    getActiveEventLandingPageBySlug(slug),
  ]);

  if (!event) {
    notFound();
  }

  if (!landingPageData) {
    // Show "no active landing page" message instead of 404
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="mt-4 text-muted-foreground">暂无激活的落地页</p>
          <p className="mt-2 text-sm text-muted-foreground">管理员正在生成中，请稍后再试</p>
        </div>
      </div>
    );
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

async function getActiveEventLandingPageBySlug(slug: string) {
  const { getActiveEventLandingPage } = await import("@/lib/ai/queries");
  const prisma = (await import("@/lib/prisma")).getPrismaClient();
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return null;
  return getActiveEventLandingPage(event.id);
}
