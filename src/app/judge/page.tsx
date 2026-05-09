import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { requireUser } from "@/lib/auth-guards";
import { linkButtonClassName } from "@/lib/button-link";
import { formatDate } from "@/lib/format";
import { listJudgeAssignedEvents } from "@/lib/reviews/queries";

export default async function JudgeDashboardPage() {
  const session = await requireUser("/judge");
  const events = await listJudgeAssignedEvents(session.user.id);
  const totalProjects = events.reduce((sum, event) => sum + event.finalProjectCount, 0);
  const scoredProjects = events.reduce((sum, event) => sum + event.scoredProjectCount, 0);

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeaderCard
        tag="评审中心"
        title="我的评审赛事"
        description="查看你被分配到的赛事，跟进待评分作品，并进入单赛事评审页完成打分。"
        extra={
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="border border-border bg-muted px-3 py-1.5">
              已分配 {events.length} 场赛事
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              已评 {scoredProjects} / {totalProjects} 份作品
            </span>
          </div>
        }
        actions={
          <Link href="/" className={linkButtonClassName("outline", "sm")}>
            返回首页
          </Link>
        }
      />

      {events.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="分配赛事" value={String(events.length)} standalone />
          <MetricCard label="待评作品" value={String(Math.max(totalProjects - scoredProjects, 0))} standalone />
          <MetricCard label="已评作品" value={String(scoredProjects)} standalone />
        </section>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          title="你暂时还没有被分配评审赛事"
          description="管理员分配评委后，对应赛事会出现在这里。"
        />
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          {events.map((event) => (
            <article key={event.eventId} className="border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">/{event.eventSlug}</p>
                  <h2 className="text-xl font-semibold">{event.eventName}</h2>
                </div>
                <EventPhaseBadge phase={event.phase} />
              </div>

              <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <p>评审时间：{formatDate(event.reviewStart)} - {formatDate(event.reviewEnd)}</p>
                <p>作品总数：{event.finalProjectCount}</p>
                <p>已评分：{event.scoredProjectCount}</p>
                <p>待评分：{event.remainingProjectCount}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/judge/events/${event.eventId}`} prefetch={false} className={linkButtonClassName("default", "sm")}>
                  进入评审
                </Link>
                <Link href={`/events/${event.eventSlug}`} prefetch={false} className={linkButtonClassName("outline", "sm")}>
                  查看赛事
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
