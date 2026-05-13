import Link from "next/link";
import { notFound } from "next/navigation";
import { createRegistration } from "@/app/(app)/my/registrations/actions";
import { InfoItem } from "@/components/info-item";
import { PageHeaderCard } from "@/components/page-header-card";
import { RegistrationForm } from "@/components/registrations/registration-form";
import { RegistrationStatusBadge } from "@/components/registrations/registration-status-badge";
import { linkButtonClassName } from "@/lib/button-link";
import { requireUser } from "@/lib/auth-guards";
import { canRegisterForEvent } from "@/lib/events/phase";
import { formatDate, formatDateRange } from "@/lib/format";
import {
  getRegistrationEventBySlug,
  getUserEventRegistration,
} from "@/lib/registrations/queries";

export default async function EventRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getRegistrationEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const session = await requireUser(`/events/${slug}/register`);
  const existingRegistration = await getUserEventRegistration(event.id, session.user.id);
  const registrationOpen = canRegisterForEvent(event);

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeaderCard
        tag="赛事报名"
        title={event.name}
        description="当前登录账号可直接填写下方报名表单并提交，管理员账号同样可以参与报名。"
        extra={
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="border border-border bg-muted px-3 py-1.5">
              报名窗口：{formatDateRange(event.registrationStart, event.registrationEnd)}
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              额外字段：{event.customFields.length > 0 ? `${event.customFields.length} 项` : "无"}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href={`/events/${event.slug}`} className={linkButtonClassName("outline", "sm")}>
              返回详情
            </Link>
            <Link href="/my/registrations" className={linkButtonClassName("outline", "sm")}>
              我的报名
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <InfoItem label="报名开始" value={formatDate(event.registrationStart)} />
        <InfoItem label="报名截止" value={formatDate(event.registrationEnd)} />
        <InfoItem label="当前状态" value={registrationOpen ? "可报名" : "未开放"} />
      </section>

      {existingRegistration ? (
        <section className="border border-border bg-card p-8">
          <div className="space-y-4">
            <RegistrationStatusBadge status={existingRegistration.status} />
            <h2 className="text-2xl font-semibold">你已经提交过本赛事报名</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              当前状态为「{getRegistrationStatusText(existingRegistration.status)}」，请前往“我的报名”继续确认或查看后续动作。
            </p>
            <Link href="/my/registrations" className={linkButtonClassName("default", "sm")}>
              查看我的报名
            </Link>
          </div>
        </section>
      ) : registrationOpen ? (
        <RegistrationForm event={event} action={createRegistration} />
      ) : (
        <section className="border border-border bg-card p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">当前不在报名时间窗口内</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              {getRegistrationHint(event.registrationStart, event.registrationEnd)}
            </p>
            <Link href={`/events/${event.slug}`} className={linkButtonClassName("default", "sm")}>
              返回赛事详情
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function getRegistrationStatusText(status: "PENDING" | "ACCEPTED" | "CONFIRMED" | "REJECTED" | "CANCELLED") {
  switch (status) {
    case "PENDING":
      return "待审核";
    case "ACCEPTED":
      return "已录取，等待确认";
    case "CONFIRMED":
      return "已确认参赛";
    case "REJECTED":
      return "未通过审核";
    case "CANCELLED":
      return "已取消报名";
  }
}

function getRegistrationHint(registrationStart: Date, registrationEnd: Date) {
  const now = new Date();

  if (now < registrationStart) {
    return `报名将于 ${formatDate(registrationStart)} 开启，请稍后再来。`;
  }

  if (now >= registrationEnd) {
    return "报名阶段已结束，当前无法再提交新报名。";
  }

  return "报名入口暂不可用。";
}
