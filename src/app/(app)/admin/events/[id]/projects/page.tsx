import Link from "next/link";
import { notFound } from "next/navigation";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { linkButtonClassName } from "@/lib/button-link";
import { formatDate } from "@/lib/format";
import {
  getAdminEventProjects,
  parseAdminProjectFilters,
} from "@/lib/projects/queries";
import { getProjectStatusLabel } from "@/lib/projects/status";

export default async function AdminEventProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; track?: string; query?: string; projectId?: string }>;
}) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const filters = parseAdminProjectFilters(rawSearchParams);
  const selectedProjectId =
    typeof rawSearchParams.projectId === "string" ? rawSearchParams.projectId : undefined;
  const data = await getAdminEventProjects(id, filters);

  if (!data) {
    notFound();
  }

  const totalCount = data.statusCounts.DRAFT + data.statusCounts.FINAL;
  const selectedProject =
    selectedProjectId ? data.projects.find((project) => project.id === selectedProjectId) : null;
  const exportHref = buildExportHref(id, filters);

  return (
    <div className="space-y-6">
      <PageHeaderCard
        tag="赛事管理 / 作品提交"
        title={data.event.name}
        description="查看本赛事所有作品提交记录，按状态或赛道筛选，并导出当前筛选结果给运营或评审团队。"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <EventPhaseBadge phase={data.event.phase} />
            <span className="border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              当前只显示此赛事的作品
            </span>
          </div>
        }
        actions={
          <>
            <Link href={exportHref} prefetch={false} className={linkButtonClassName("outline", "sm")}>
              导出 CSV
            </Link>
            <Link href={`/admin/events/${id}/registrations`} prefetch={false} className={linkButtonClassName("outline", "sm")}>
              报名管理
            </Link>
            <Link href="/admin/events" prefetch={false} className={linkButtonClassName("outline", "sm")}>
              返回赛事列表
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="作品总数" value={String(totalCount)} standalone />
        <MetricCard label="草稿" value={String(data.statusCounts.DRAFT)} standalone />
        <MetricCard label="终稿" value={String(data.statusCounts.FINAL)} standalone />
      </section>

      {selectedProject ? (
        <section className="border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">作品详情</p>
              <h2 className="text-2xl font-semibold">{selectedProject.name}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{selectedProject.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ProjectStatusBadge status={selectedProject.status} />
              <Link href={buildProjectDetailHref(id, filters)} prefetch={false} className={linkButtonClassName("outline", "sm")}>
                收起详情
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">提交人信息</p>
              <p className="mt-2">{selectedProject.user.name || "未填写姓名"}</p>
              <p className="mt-1">{selectedProject.user.email || "未绑定邮箱"}</p>
              <p className="mt-1">队伍：{selectedProject.teamName || "个人参赛"}</p>
              <p className="mt-1">赛道：{selectedProject.track || "未选择"}</p>
            </div>
            <div className="border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">提交内容</p>
              <p className="mt-2">创建时间：{formatDate(selectedProject.createdAt)}</p>
              <p className="mt-1">最近更新：{formatDate(selectedProject.updatedAt)}</p>
              <p className="mt-1">
                关联赛题：{selectedProject.challenges.length > 0 ? selectedProject.challenges.join("、") : "未关联"}
              </p>
            </div>
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
      ) : null}

      <section className="border border-border bg-card p-5 lg:p-6">
        <form className="grid gap-4 md:grid-cols-[1.2fr_0.7fr_0.7fr_auto_auto]">
          <div>
            <label htmlFor="project-search" className="text-sm font-medium">搜索作品 / 提交者 / 邮箱 / 队伍</label>
            <input
              id="project-search"
              name="query"
              defaultValue={filters.query}
              placeholder="例如：Factory、张三、team、example@company.com"
              className="mt-2 flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div>
            <label htmlFor="project-status-filter" className="text-sm font-medium">状态筛选</label>
            <select
              id="project-status-filter"
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-2 flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">全部状态</option>
              <option value="DRAFT">{getProjectStatusLabel("DRAFT")}</option>
              <option value="FINAL">{getProjectStatusLabel("FINAL")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="project-track-filter" className="text-sm font-medium">赛道筛选</label>
            <select
              id="project-track-filter"
              name="track"
              defaultValue={filters.track ?? ""}
              className="mt-2 flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">全部赛道</option>
              {data.event.tracks.map((track) => (
                <option key={track.name} value={track.name}>
                  {track.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" size="sm">
              应用筛选
            </Button>
          </div>
          <div className="flex items-end">
            <Link href={`/admin/events/${id}/projects`} prefetch={false} className={linkButtonClassName("outline", "sm")}>
              重置
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden border border-border bg-card">
        {data.projects.length === 0 ? (
          <EmptyState
            title="本赛事暂无作品提交"
            description="选手确认参赛并在提交窗口内保存草稿或终稿后，会自动出现在这里。"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>作品</TableHead>
                <TableHead>提交者</TableHead>
                <TableHead>队伍</TableHead>
                <TableHead>赛道</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.map((project) => (
                <TableRow key={project.id} data-state={selectedProjectId === project.id ? "selected" : undefined}>
                  <TableCell className="max-w-sm whitespace-normal">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm text-muted-foreground">
                    <div>{project.user.name || "未填写姓名"}</div>
                    <div className="mt-1 text-xs">{project.user.email || "未绑定邮箱"}</div>
                  </TableCell>
                  <TableCell>{project.teamName || "个人参赛"}</TableCell>
                  <TableCell>{project.track || "未选择"}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{formatDate(project.updatedAt)}</div>
                    <div className="mt-1 text-xs">创建：{formatDate(project.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={buildProjectDetailHref(id, filters, project.id)}
                        prefetch={false}
                        className={linkButtonClassName("outline", "sm")}
                      >
                        查看详情
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function buildExportHref(
  eventId: string,
  filters: { status?: string; track?: string; query: string }
) {
  const searchParams = new URLSearchParams();

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.track) {
    searchParams.set("track", filters.track);
  }

  if (filters.query) {
    searchParams.set("query", filters.query);
  }

  const suffix = searchParams.toString();
  return `/admin/events/${eventId}/projects/export${suffix ? `?${suffix}` : ""}`;
}

function buildProjectDetailHref(
  eventId: string,
  filters: { status?: string; track?: string; query: string },
  projectId?: string
) {
  const searchParams = new URLSearchParams();

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.track) {
    searchParams.set("track", filters.track);
  }

  if (filters.query) {
    searchParams.set("query", filters.query);
  }

  if (projectId) {
    searchParams.set("projectId", projectId);
  }

  const suffix = searchParams.toString();
  return `/admin/events/${eventId}/projects${suffix ? `?${suffix}` : ""}`;
}
