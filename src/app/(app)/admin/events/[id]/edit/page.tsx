import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEvent } from "@/app/(app)/admin/events/actions";
import { EventDeleteButton } from "@/components/events/event-delete-button";
import { EventForm } from "@/components/events/event-form";
import { GenerateLandingButton } from "@/components/events/generate-landing-button";
import { PageHeaderCard } from "@/components/page-header-card";
import { Badge } from "@/components/ui/badge";
import { linkButtonClassName } from "@/lib/button-link";
import { getAdminEventById } from "@/lib/events/queries";
import { type EventFormInput } from "@/lib/events/schema";

export default async function AdminEditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getAdminEventById(id);

  if (!event) {
    notFound();
  }

  const eventId = event.id;
  const hasLandingPage = Boolean(event.landingPage);

  async function submitAction(input: EventFormInput) {
    "use server";

    return updateEvent({
      ...input,
      eventId,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        tag="赛事管理 / 编辑"
        title="编辑赛事"
        description={`当前正在编辑“${event.name}”，保存后会直接覆盖后台配置；若赛事已发布，前台详情也会同步刷新。`}
        extra={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={event.published ? "default" : "outline"}>
              {event.published ? "已发布" : "草稿"}
            </Badge>
            <span className="border border-border bg-muted px-3 py-1.5">
              当前 slug：/{event.slug}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-3">
            {!event.published ? (
              <EventDeleteButton eventId={event.id} redirectTo="/admin/events" />
            ) : null}
            <GenerateLandingButton
              eventId={eventId}
              hasLandingPage={hasLandingPage}
            />
            {hasLandingPage && (
              <Link
                href={`/admin/events/${eventId}/landing-preview`}
                target="_blank"
                className={linkButtonClassName("outline", "sm")}
              >
                查看落地页
              </Link>
            )}
            <Link
              href={`/admin/events/${event.id}/registrations`}
              className={linkButtonClassName("outline", "sm")}
            >
              报名管理
            </Link>
            <Link
              href={`/admin/events/${event.id}/judging`}
              className={linkButtonClassName("outline", "sm")}
            >
              评审管理
            </Link>
            {event.published ? (
              <Link
                href={`/events/${event.slug}`}
                className={linkButtonClassName("outline", "sm")}
              >
                查看前台
              </Link>
            ) : null}
            <Link href="/admin/events" className={linkButtonClassName("outline", "sm")}>
              返回列表
            </Link>
          </div>
        }
      />

      <EventForm
        action={submitAction}
        initialValues={event}
        submitLabel="保存修改"
        helperText={
          event.published
            ? "保存后会刷新后台列表与前台赛事详情，请确认时间窗口与展示信息无误；若赛事已产生评分，评分维度将被冻结，避免影响已提交评分和榜单汇总。"
            : "保存后仍保持草稿状态，可返回列表后再决定是否发布；若赛事已产生评分，评分维度将被冻结，避免影响已提交评分和榜单汇总。"
        }
      />
    </div>
  );
}
