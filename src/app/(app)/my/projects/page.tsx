import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { InfoItem } from "@/components/info-item";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { requireUser } from "@/lib/auth-guards";
import { linkButtonClassName } from "@/lib/button-link";
import { formatDate, formatDateRange } from "@/lib/format";
import { listUserProjects } from "@/lib/projects/queries";

export default async function MyProjectsPage() {
  const session = await requireUser("/my/projects");
  const projects = await listUserProjects(session.user.id);
  const draftCount = projects.filter((project) => project.status === "DRAFT").length;
  const finalCount = projects.filter((project) => project.status === "FINAL").length;

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeaderCard
        tag="用户中心"
        title="我的作品"
        description="查看你已提交到各个赛事的作品，草稿与终稿都会保留在这里，便于继续编辑或追踪后续评审阶段。"
        extra={
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="border border-border bg-muted px-3 py-1.5">
              共 {projects.length} 份作品
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              草稿 {draftCount} 份
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              终稿 {finalCount} 份
            </span>
          </div>
        }
        actions={
          <Link href="/" className={linkButtonClassName("outline", "sm")}>
            返回首页
          </Link>
        }
      />

      {projects.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="作品总数" value={String(projects.length)} standalone />
          <MetricCard label="草稿" value={String(draftCount)} standalone />
          <MetricCard label="终稿" value={String(finalCount)} standalone />
        </section>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState
          title="你还没有提交任何作品"
          description="先确认参赛后即可进入作品提交页，保存草稿或终稿后这里会展示你的最新提交记录。"
        >
          <Link href="/" className={linkButtonClassName("default", "sm", "mt-4")}>
            去看赛事
          </Link>
        </EmptyState>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.id}
              className="flex h-full flex-col border border-border bg-card p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">/{project.event.slug}</p>
                  <h2 className="text-xl font-semibold">{project.name}</h2>
                  <p className="text-sm text-muted-foreground">{project.event.name}</p>
                </div>
                <ProjectStatusBadge status={project.status} />
              </div>

              <dl className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <InfoItem label="最近更新" value={formatDate(project.updatedAt)} />
                <InfoItem
                  label="赛事时间"
                  value={formatDateRange(project.event.startDate, project.event.endDate)}
                />
                <InfoItem label="队伍名称" value={project.teamName || "个人参赛"} />
                <InfoItem label="参赛赛道" value={project.track || "未选择"} />
              </dl>

              <div className="mt-6 border border-border px-4 py-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">提交内容概览</p>
                <p className="mt-2 line-clamp-3 leading-7">{project.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.challenges.length > 0 ? (
                    project.challenges.map((challenge) => (
                      <span
                        key={`${project.id}-${challenge}`}
                        className="border border-border bg-background px-3 py-1 text-xs"
                      >
                        {challenge}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs">未关联赛题</span>
                  )}
                </div>
              </div>

              <div className="mt-6 border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">下一步</p>
                <p className="mt-2 leading-7">{getProjectNextStep(project.event.phase, project.event.reviewStart, project.event.reviewEnd)}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/events/${project.event.slug}/submit`}
                  prefetch={false}
                  className={linkButtonClassName("default", "sm")}
                >
                  {project.status === "FINAL" ? "继续编辑作品" : "继续完善草稿"}
                </Link>
                <Link
                  href={`/events/${project.event.slug}`}
                  prefetch={false}
                  className={linkButtonClassName("outline", "sm")}
                >
                  查看赛事
                </Link>
                {project.demoUrl ? (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={linkButtonClassName("outline", "sm")}
                  >
                    打开演示
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function getProjectNextStep(
  phase: "DRAFT" | "UPCOMING" | "REGISTRATION" | "SUBMISSION_PENDING" | "SUBMISSION" | "REVIEW_PENDING" | "REVIEW" | "COMPLETED",
  reviewStart: Date,
  reviewEnd: Date
) {
  switch (phase) {
    case "SUBMISSION":
      return "当前仍在提交窗口内，如有需要可继续完善作品并重新提交终稿。";
    case "REVIEW_PENDING":
      return `评审将于 ${formatDate(reviewStart)} 开启，届时评委会开始查看所有已提交作品。`;
    case "REVIEW":
      return `评审进行中，预计 ${formatDate(reviewEnd)} 结束；当前不会展示具体评分细节。`;
    case "COMPLETED":
      return "评审已结束，排名将在管理员发布后公开展示。";
    default:
      return "当前赛事尚未进入评审阶段，作品记录会继续保留在这里。";
  }
}
