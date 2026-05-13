import { notFound } from "next/navigation";
import { getAdminEventById } from "@/lib/events/queries";
import { GeneratingPageContent } from "@/components/events/generating-page-content";

export default async function AdminEventGeneratingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ styleHint?: string }>;
}) {
  const { id } = await params;
  const { styleHint } = await searchParams;
  const event = await getAdminEventById(id);

  if (!event) {
    notFound();
  }

  return (
    <GeneratingPageContent
      eventId={event.id}
      eventName={event.name}
      initialStyleHint={styleHint}
    />
  );
}
