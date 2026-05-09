import Link from "next/link";
import { notFound } from "next/navigation";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { InfoItem } from "@/components/info-item";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { RegistrationStatusBadge } from "@/components/registrations/registration-status-badge";
import { ProjectRankingTable } from "@/components/reviews/project-ranking-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getConfiguredAuthProviders } from "@/lib/auth-providers";
import { getOptionalSession } from "@/lib/auth-session";
import { linkButtonClassName } from "@/lib/button-link";
import { canRegisterForEvent, canSubmitProjectForEvent } from "@/lib/events/phase";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { formatDate, formatDateRange } from "@/lib/format";
import { getUserEventProject } from "@/lib/projects/queries";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { getRegistrationEntryState } from "@/lib/registrations/entry-state";
import { getUserEventRegistration } from "@/lib/registrations/queries";
import { getPublishedEventRankingBySlug } from "@/lib/reviews/queries";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const sessionPromise = getOptionalSession();
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const session = await sessionPromise;
  const [rankingData, currentRegistration, currentProject] = await Promise.all([
    event.rankingsPublished ? getPublishedEventRankingBySlug(slug) : Promise.resolve(null),
    session?.user ? getUserEventRegistration(event.id, session.user.id) : Promise.resolve(null),
    session?.user ? getUserEventProject(event.id, session.user.id) : Promise.resolve(null),
  ]);
  const authReady = Boolean(process.env.AUTH_SECRET?.trim()) && getConfiguredAuthProviders().length > 0;
  const registrationOpen = canRegisterForEvent(event);
  const submissionOpen = canSubmitProjectForEvent(event);
  const entryState = getRegistrationEntryState({
    currentRegistrationStatus: currentRegistration?.status,
    isAuthenticated: Boolean(session?.user),
    registrationOpen,
    authReady,
  });

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeaderCard
        tag="赛事详情"
        title={event.name}
        description={event.description}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <EventPhaseBadge phase={event.phase} />
            <Badge variant="outline">/{event.slug}</Badge>
          </div>
        }
        actions={
          <div className="w-full border border-border bg-background/75 p-4 lg:min-w-72">
            <h2 className="text-sm font-semibold">报名状态</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {getRegistrationEntryHint(
                entryState,
                event.registrationStart,
                event.registrationEnd
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {entryState.kind === "existing" ? (
                <>
                  <RegistrationStatusBadge status={entryState.status} />
                  <Link href="/my/registrations" className={linkButtonClassName("outline", "sm")}>
                    查看我的报名
                  </Link>
                </>
              ) : entryState.kind === "can_register" ? (
                <Link
                  href={`/events/${event.slug}/register`}
                  className={linkButtonClassName("default", "sm")}
                >
                  立即报名
                </Link>
              ) : entryState.kind === "auth_unavailable" ? (
                <Button disabled>待配置登录能力</Button>
              ) : entryState.kind === "closed" ? (
                <Link href="/" className={linkButtonClassName("outline", "sm")}>
                  返回赛事列表
                </Link>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {entryState.kind === "login_required" ? (
                <span className="inline-flex items-center border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
                  请先登录后再报名
                </span>
              ) : null}
              {entryState.kind === "can_register" && session?.user?.role === "ADMIN" ? (
                <span className="inline-flex items-center border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
                  当前管理员账号也可直接报名
                </span>
              ) : null}
            </div>

            {session?.user && currentRegistration ? (
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">作品提交</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {getProjectEntryHint(currentRegistration.status, currentProject?.status, submissionOpen, event.submissionStart, event.submissionEnd)}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {currentProject ? <ProjectStatusBadge status={currentProject.status} /> : null}
                  {currentRegistration.status === "CONFIRMED" && currentProject ? (
                    <>
                      <Link
                        href={`/events/${event.slug}/submit`}
                        className={linkButtonClassName("default", "sm")}
                      >
                        继续编辑作品
                      </Link>
                      <Link href="/my/projects" className={linkButtonClassName("outline", "sm")}>
                        查看我的作品
                      </Link>
                    </>
                  ) : null}
                  {currentRegistration.status === "CONFIRMED" && !currentProject && submissionOpen ? (
                    <Link
                      href={`/events/${event.slug}/submit`}
                      className={linkButtonClassName("default", "sm")}
                    >
                      提交作品
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="赛道" value={String(event.tracks.length)} standalone />
        <MetricCard label="奖项" value={String(event.prizes.length)} standalone />
        <MetricCard label="评分维度" value={String(event.scoringCriteria.length)} standalone />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">赛事时间线</h2>
          <div className="mt-4 grid gap-3">
            <InfoItem label="赛事时间" value={formatDateRange(event.startDate, event.endDate)} />
            <InfoItem
              label="报名阶段"
              value={formatDateRange(event.registrationStart, event.registrationEnd)}
            />
            <InfoItem
              label="作品提交"
              value={formatDateRange(event.submissionStart, event.submissionEnd)}
            />
            <InfoItem
              label="评审阶段"
              value={formatDateRange(event.reviewStart, event.reviewEnd)}
            />
          </div>
        </article>

        <article className="border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">赛事配置概览</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 border border-border bg-background/50 p-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-mono-ui-face)] text-[11px] uppercase tracking-[0.16em] text-muted-foreground">赛道</span>
              <span className="font-semibold tabular-nums [font-family:var(--font-display-face)]">{event.tracks.length} 项</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-mono-ui-face)] text-[11px] uppercase tracking-[0.16em] text-muted-foreground">奖项</span>
              <span className="font-semibold tabular-nums [font-family:var(--font-display-face)]">{event.prizes.length} 项</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-mono-ui-face)] text-[11px] uppercase tracking-[0.16em] text-muted-foreground">评分维度</span>
              <span className="font-semibold tabular-nums [font-family:var(--font-display-face)]">{event.scoringCriteria.length} 项</span>
            </div>
          </div>
          <div className="mt-4 border border-border px-4 py-4 text-sm text-muted-foreground">
            报名附加字段：{event.customFields.length > 0 ? `${event.customFields.length} 项` : "默认字段"}
          </div>
        </article>
      </section>

      {event.tracks.length > 0 ? (
        <section className="border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">赛道</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {event.tracks.map((track) => (
              <article key={track.name} className="border border-border bg-background/50 p-4">
                <h3 className="font-medium">{track.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {track.description || "暂无赛道补充说明。"}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {event.challenges.length > 0 ? (
        <section className="border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">赛题</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {event.challenges.map((challenge) => (
              <article key={challenge.title} className="border border-border bg-background/50 p-4">
                <h3 className="font-medium">{challenge.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {challenge.description || "暂无赛题补充说明。"}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {event.prizes.length > 0 ? (
        <section className="border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">奖项设置</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {event.prizes.map((prize) => (
              <article key={prize.title} className="border border-border bg-background/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{prize.title}</h3>
                  {prize.amount ? (
                    <span className="text-sm font-medium text-primary">{prize.amount}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {prize.description || "暂无奖项补充说明。"}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">评分维度</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {event.scoringCriteria.map((criterion) => (
            <article key={criterion.name} className="border border-border bg-background/50 p-4">
              <h3 className="font-medium">{criterion.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                最高分 {criterion.maxScore} / 权重 {criterion.weight}%
              </p>
            </article>
          ))}
        </div>
      </section>

      {rankingData ? (
        <section className="overflow-hidden border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-xl font-semibold">公开榜单</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              当前榜单基于评委已提交的有效评分汇总而成，按平均加权总分降序展示。
            </p>
          </div>
          <ProjectRankingTable rankings={rankingData.rankings} />
        </section>
      ) : null}
    </div>
  );
}


function getRegistrationHint(registrationStart: Date, registrationEnd: Date) {
  const now = new Date();

  if (now < registrationStart) {
    return `报名将于 ${formatDate(registrationStart)} 开启。`;
  }

  if (now >= registrationEnd) {
    return "报名阶段已结束，可继续关注作品提交与评审进度。";
  }

  return "报名入口暂未开放。";
}

function getRegistrationEntryHint(
  entryState: ReturnType<typeof getRegistrationEntryState>,
  registrationStart: Date,
  registrationEnd: Date
) {
  switch (entryState.kind) {
    case "existing":
      return getRegistrationStatusHint(entryState.status);
    case "can_register":
      return "报名窗口已开启，当前登录账号可立即提交报名表。";
    case "login_required":
      return "报名窗口已开启，请先登录后再进入报名表单。";
    case "auth_unavailable":
      return "报名窗口已开启，但当前环境尚未配置登录能力。";
    case "closed":
      return getRegistrationHint(registrationStart, registrationEnd);
  }
}

function getProjectEntryHint(
  registrationStatus: "PENDING" | "ACCEPTED" | "CONFIRMED" | "REJECTED" | "CANCELLED",
  projectStatus: "DRAFT" | "FINAL" | undefined,
  submissionOpen: boolean,
  submissionStart: Date,
  submissionEnd: Date
) {
  if (registrationStatus !== "CONFIRMED") {
    return "需要先完成参赛确认，随后才能进入作品提交。";
  }

  if (projectStatus === "FINAL") {
    return submissionOpen
      ? "你已提交终稿，截止前仍可继续修改并重新提交。"
      : "你已提交终稿，当前提交窗口已结束。";
  }

  if (projectStatus === "DRAFT") {
    return submissionOpen
      ? "你已有一份草稿，当前可继续完善并提交终稿。"
      : "你已有一份草稿，但提交窗口当前未开放。";
  }

  if (submissionOpen) {
    return "提交窗口已开启，确认参赛后即可提交作品。";
  }

  if (new Date() < submissionStart) {
    return `作品提交将于 ${formatDate(submissionStart)} 开启。`;
  }

  if (new Date() >= submissionEnd) {
    return "作品提交已结束，可前往“我的作品”查看留存记录。";
  }

  return "当前暂不能提交作品。";
}

function getRegistrationStatusHint(
  status: "PENDING" | "ACCEPTED" | "CONFIRMED" | "REJECTED" | "CANCELLED"
) {
  switch (status) {
    case "PENDING":
      return "你已提交报名，当前等待管理员审核。";
    case "ACCEPTED":
      return "管理员已接受你的报名，请前往“我的报名”确认参赛。";
    case "CONFIRMED":
      return "你已确认参赛，可继续关注后续作品提交与评审安排。";
    case "REJECTED":
      return "本次报名未通过审核，如有疑问请联系管理员。";
    case "CANCELLED":
      return "你已取消本次报名，当前不会参与后续流程。";
  }
}
