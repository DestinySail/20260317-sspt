import Link from "next/link";
import { cancelRegistration, confirmRegistration } from "@/app/my/registrations/actions";
import { EmptyState } from "@/components/empty-state";
import { InfoItem } from "@/components/info-item";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { RegistrationActionButton } from "@/components/registrations/registration-action-button";
import { RegistrationStatusBadge } from "@/components/registrations/registration-status-badge";
import { requireUser } from "@/lib/auth-guards";
import { linkButtonClassName } from "@/lib/button-link";
import { formatDate, formatDateRange } from "@/lib/format";
import {
  canCancelRegistration,
  canConfirmRegistration,
} from "@/lib/registration-status";
import { listUserRegistrations } from "@/lib/registrations/queries";

export default async function MyRegistrationsPage() {
  const session = await requireUser("/my/registrations");
  const registrations = await listUserRegistrations(session.user.id);
  const pendingCount = registrations.filter((item) => item.status === "PENDING").length;
  const activeCount = registrations.filter((item) =>
    ["ACCEPTED", "CONFIRMED"].includes(item.status)
  ).length;

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeaderCard
        tag="用户中心"
        title="我的报名"
        description="查看你已提交的赛事报名，管理员录取后可在此确认参赛，已录取或已确认状态也可主动取消。"
        extra={
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="border border-border bg-muted px-3 py-1.5">
              共 {registrations.length} 条报名
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              待审核 {pendingCount} 条
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              可继续操作 {activeCount} 条
            </span>
          </div>
        }
        actions={
          <Link href="/" className={linkButtonClassName("outline", "sm")}>
            返回首页
          </Link>
        }
      />

      {registrations.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="报名总数" value={String(registrations.length)} standalone />
          <MetricCard label="待审核" value={String(pendingCount)} standalone />
          <MetricCard label="可继续操作" value={String(activeCount)} standalone />
        </section>
      ) : null}

      {registrations.length === 0 ? (
        <EmptyState
          title="你还没有提交任何报名"
          description="去首页或赛事详情页查看当前开放中的赛事，提交后这里会展示你的报名状态。"
        >
          <Link href="/" className={linkButtonClassName("default", "sm", "mt-4")}>
            去看赛事
          </Link>
        </EmptyState>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          {registrations.map((registration) => (
            <article
              key={registration.id}
              className="flex h-full flex-col border border-border bg-card p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">/{registration.event.slug}</p>
                  <h2 className="text-xl font-semibold">{registration.event.name}</h2>
                </div>
                <RegistrationStatusBadge status={registration.status} />
              </div>

              <dl className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <InfoItem label="报名时间" value={formatDate(registration.createdAt)} />
                <InfoItem label="队伍名称" value={registration.teamName || "个人参赛"} />
                <InfoItem
                  label="赛事时间"
                  value={formatDateRange(registration.event.startDate, registration.event.endDate)}
                />
              </dl>

              <div className="mt-6 border border-border px-4 py-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">补充信息</p>
                {registration.answers.length === 0 ? (
                  <p className="mt-2">无额外报名字段。</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {registration.answers.map((answer) => (
                      <p key={`${registration.id}-${answer.label}`}>
                        <span className="font-medium text-foreground">{answer.label}：</span>
                        {answer.value || "未填写"}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/events/${registration.event.slug}`} prefetch={false} className={linkButtonClassName("outline", "sm")}>
                  查看赛事
                </Link>
                {canConfirmRegistration(registration.status) ? (
                  <RegistrationActionButton
                    action={confirmRegistration}
                    registrationId={registration.id}
                    label="确认参赛"
                    pendingLabel="确认中..."
                  />
                ) : null}
                {canCancelRegistration(registration.status) ? (
                  <RegistrationActionButton
                    action={cancelRegistration}
                    registrationId={registration.id}
                    label="取消报名"
                    pendingLabel="取消中..."
                    variant="destructive"
                  />
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
