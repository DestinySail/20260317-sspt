import Link from "next/link";
import { notFound } from "next/navigation";
import { upsertProjectScore } from "@/app/(app)/judge/actions";
import { EmptyState } from "@/components/empty-state";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { JudgeScoreForm } from "@/components/reviews/judge-score-form";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { Badge } from "@/components/ui/badge";
import { linkButtonClassName } from "@/lib/button-link";
import { canReviewEvent } from "@/lib/events/phase";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth-guards";
import { getJudgeEventReviewData } from "@/lib/reviews/queries";

export default async function JudgeEventReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { id } = await params;
  const session = await requireUser(`/judge/events/${id}`);
  const data = await getJudgeEventReviewData(id, session.user.id);

  if (!data) {
    notFound();
  }

  const { projectId } = await searchParams;
  const selectedProject =
    data.projects.find((project) => project.id === projectId) ?? data.projects[0] ?? null;
  const reviewOpen = canReviewEvent(data.event);

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeaderCard
        tag="评审中心 / 单赛事"
        title={data.event.name}
        description="查看本赛事终稿作品，选择作品后按评分维度填写分数与评语。评分可反复保存，以最后一次为准。"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <EventPhaseBadge phase={data.event.phase} />
            <span className="border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              评审时间：{formatDate(data.event.reviewStart)} - {formatDate(data.event.reviewEnd)}
            </span>
          </div>
        }
        actions={
          <>
            <Link href={`/events/${data.event.slug}`} className={linkButtonClassName("outline", "sm")}>
              查看赛事
            </Link>
            <Link href="/judge" className={linkButtonClassName("outline", "sm")}>
              返回评审中心
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="终稿作品" value={String(data.metrics.finalProjectCount)} standalone />
        <MetricCard label="已评分" value={String(data.metrics.scoredProjectCount)} standalone />
        <MetricCard label="待评分" value={String(data.metrics.remainingProjectCount)} standalone />
      </section>

      {data.projects.length === 0 ? (
        <EmptyState
          title="当前还没有终稿作品"
          description="选手提交终稿后，这里会显示可供评审的作品。"
        />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-xl font-semibold">作品列表</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                已评分作品会显示“已保存评分”，点击任一作品即可在右侧查看详情并继续修改。
              </p>
            </div>

            <div className="divide-y divide-border">
              {data.projects.map((project) => {
                const isActive = selectedProject?.id === project.id;

                return (
                  <article
                    key={project.id}
                    className={`px-6 py-5 transition-colors ${isActive ? "bg-primary/5" : "bg-card"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.teamName || "个人参赛"}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.track || "未分配赛道"} · 最近更新 {formatDate(project.updatedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={project.currentJudgeScore ? "default" : "outline"}>
                          {project.currentJudgeScore ? "已保存评分" : "待评分"}
                        </Badge>
                        <Link
                          href={`/judge/events/${id}?projectId=${project.id}`}
                          prefetch={false}
                          className={linkButtonClassName("outline", "sm")}
                        >
                          {isActive ? "当前作品" : "去评分"}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {selectedProject ? (
            <div className="space-y-6">
              <section className="border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">{selectedProject.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedProject.user.name || "未填写姓名"} · {selectedProject.user.email || "未绑定邮箱"}
                    </p>
                  </div>
                  {selectedProject.currentJudgeScore ? (
                    <Badge variant="default">
                      已评分 {selectedProject.currentJudgeScore.totalScore.toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">尚未评分</Badge>
                  )}
                </div>

                <div className="mt-6 grid gap-4 text-sm text-muted-foreground">
                  <p>{selectedProject.description}</p>
                  <p>队伍：{selectedProject.teamName || "个人参赛"}</p>
                  <p>赛道：{selectedProject.track || "未分配"}</p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {selectedProject.sourceUrl ? (
                    <a
                      href={selectedProject.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={linkButtonClassName("outline", "sm")}
                    >
                      查看源码
                    </a>
                  ) : null}
                  {selectedProject.demoUrl ? (
                    <a
                      href={selectedProject.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={linkButtonClassName("outline", "sm")}
                    >
                      打开演示
                    </a>
                  ) : null}
                  {selectedProject.videoUrl ? (
                    <a
                      href={selectedProject.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={linkButtonClassName("outline", "sm")}
                    >
                      查看视频
                    </a>
                  ) : null}
                </div>
              </section>

              <JudgeScoreForm
                key={`${selectedProject.id}:${selectedProject.currentJudgeScore?.id ?? "draft"}`}
                eventId={data.event.id}
                projectId={selectedProject.id}
                criteria={data.event.scoringCriteria}
                reviewOpen={reviewOpen}
                initialComment={selectedProject.currentJudgeScore?.comment}
                initialEntries={selectedProject.currentJudgeScore?.entries}
                action={upsertProjectScore}
              />
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
