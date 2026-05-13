import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assignJudgeToEvent,
  removeJudgeFromEvent,
  toggleRankingsPublish,
} from "@/app/(app)/admin/events/actions";
import { JudgeAssignmentPanel } from "@/components/reviews/judge-assignment-panel";
import { ProjectRankingTable } from "@/components/reviews/project-ranking-table";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { linkButtonClassName } from "@/lib/button-link";
import { formatDate } from "@/lib/format";
import { getAdminEventJudgingData } from "@/lib/reviews/queries";

export default async function AdminEventJudgingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminEventJudgingData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        tag="赛事管理 / 评审与排名"
        title={data.event.name}
        description="在这里分配评委、跟踪评分覆盖率，并决定何时把榜单公开到前台赛事详情页。"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <EventPhaseBadge phase={data.event.phase} />
            <span className="border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              评审窗口：{formatDate(data.event.reviewStart)} - {formatDate(data.event.reviewEnd)}
            </span>
            <span className="border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              前台公示：{data.event.rankingsPublished ? "已开启" : "未开启"}
            </span>
          </div>
        }
        actions={
          <>
            <Link href={`/admin/events/${id}/projects`} className={linkButtonClassName("outline", "sm")}>
              作品管理
            </Link>
            <Link href={`/admin/events/${id}/edit`} className={linkButtonClassName("outline", "sm")}>
              编辑赛事
            </Link>
            <Link href="/admin/events" className={linkButtonClassName("outline", "sm")}>
              返回赛事列表
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="已分配评委" value={String(data.metrics.assignedJudgeCount)} standalone />
        <MetricCard label="终稿作品" value={String(data.metrics.finalProjectCount)} standalone />
        <MetricCard label="已评分作品" value={String(data.metrics.scoredProjectCount)} standalone />
        <MetricCard label="已上榜作品" value={String(data.metrics.rankedProjectCount)} standalone />
      </section>

      <JudgeAssignmentPanel
        eventId={data.event.id}
        rankingsPublished={data.event.rankingsPublished}
        canPublishRankings={data.rankings.length > 0}
        judges={data.judges}
        assignAction={assignJudgeToEvent}
        removeAction={removeJudgeFromEvent}
        toggleRankingsAction={toggleRankingsPublish}
      />

      <section className="overflow-hidden border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold">当前榜单</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            榜单按平均加权总分降序展示；仅统计与当前评分维度配置一致的有效评分记录。
          </p>
        </div>
        <ProjectRankingTable
          rankings={data.rankings}
          showCriteria
          emptyMessage="当前还没有可汇总的评分。请先分配评委并完成至少一份作品评分。"
        />
      </section>
    </div>
  );
}
