import { notFound } from "next/navigation";
import { getEventLandingPageByEventId } from "@/lib/ai/queries";

export default async function AdminLandingPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const landingPage = await getEventLandingPageByEventId(id);

  if (!landingPage) {
    notFound();
  }

  const html = landingPage.content;

  return (
    <iframe
      srcDoc={html}
      className="h-screen w-full border-0"
      title={`${landingPage.event.name} - 赛事落地页预览`}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
