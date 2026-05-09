import Link from "next/link";
import { togglePublish } from "@/app/admin/events/actions";
import { formatDate, formatDateRange } from "@/lib/format";
import { EventDeleteButton } from "@/components/events/event-delete-button";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";
import { Badge } from "@/components/ui/badge";
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
import { listAdminEvents } from "@/lib/events/queries";

export default async function AdminEventsPage() {
  const events = await listAdminEvents();
  const publishedCount = events.filter((event) => event.published).length;
  const draftCount = events.length - publishedCount;

  return (
    <div className="space-y-6">
      <PageHeaderCard
        tag="赛事管理"
        title="赛事列表"
        description="在这里创建、编辑赛事，查看当前阶段，并按需将草稿发布到前台首页。"
        extra={
          <p className="text-xs leading-6 text-muted-foreground">
            安全删除策略：仅未发布且没有报名、作品、评分、评委分配数据的赛事可删除。
          </p>
        }
        actions={
          <Link href="/admin/events/new" className={linkButtonClassName("default", "sm")}>
            创建赛事
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="赛事总数" value={String(events.length)} standalone />
        <MetricCard label="已发布" value={String(publishedCount)} standalone />
        <MetricCard label="草稿" value={String(draftCount)} standalone />
      </section>

      <section className="border border-border bg-card">
        {events.length === 0 ? (
          <div className="border border-dashed border-border px-6 py-12 text-center">
            <h2 className="text-lg font-semibold">还没有赛事</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              先创建第一个赛事，随后即可在这里发布并同步到前台首页。
            </p>
            <Link href="/admin/events/new" className={linkButtonClassName("outline", "sm", "mt-4")}>
              立即创建
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile card list view */}
            <div className="flex flex-col gap-4 p-4 md:hidden">
              {events.map((event) => (
                <article key={event.id} className="space-y-3 border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground">{event.name}</h3>
                    <EventPhaseBadge phase={event.phase} />
                    <Badge variant={event.published ? "default" : "outline"}>
                      {event.published ? "已发布" : "草稿"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">/{event.slug}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>报名截止：{formatDate(event.registrationEnd)}</span>
                    <span>{event.tracks.length} 赛道</span>
                    <span>{event.prizes.length} 奖项</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      href={`/admin/events/${event.id}/edit`}
                      prefetch={false}
                      className={linkButtonClassName("outline", "sm")}
                    >
                      编辑
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}/registrations`}
                      prefetch={false}
                      className={linkButtonClassName("outline", "sm")}
                    >
                      报名
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}/projects`}
                      prefetch={false}
                      className={linkButtonClassName("outline", "sm")}
                    >
                      作品
                    </Link>
                    {event.published ? (
                      <Link
                        href={`/events/${event.slug}`}
                        prefetch={false}
                        className={linkButtonClassName("outline", "sm")}
                      >
                        预览
                      </Link>
                    ) : (
                      <span className={linkButtonClassName("outline", "sm", "pointer-events-none opacity-60")}>
                        待发布
                      </span>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        const result = await togglePublish({
                          eventId: event.id,
                          published: !event.published,
                        });

                        if (!result.success) {
                          throw new Error(result.error.message);
                        }
                      }}
                    >
                      <Button type="submit" variant="outline" size="sm">
                        {event.published ? "取消发布" : "发布"}
                      </Button>
                    </form>
                    {!event.published ? <EventDeleteButton eventId={event.id} /> : null}
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden overflow-hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>赛事</TableHead>
                    <TableHead>阶段</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>配置</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="max-w-sm whitespace-normal">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{event.name}</p>
                          <p className="text-xs text-muted-foreground">/{event.slug}</p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <EventPhaseBadge phase={event.phase} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.published ? "default" : "outline"}>
                          {event.published ? "已发布" : "草稿"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal text-sm text-muted-foreground">
                        <div>{formatDateRange(event.startDate, event.endDate)}</div>
                        <div className="mt-1 text-xs">报名截止：{formatDate(event.registrationEnd)}</div>
                      </TableCell>
                      <TableCell className="whitespace-normal text-sm text-muted-foreground">
                        <div>{event.tracks.length} 个赛道</div>
                        <div>{event.prizes.length} 个奖项</div>
                        <div>{event.scoringCriteria.length} 个评分维度</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            prefetch={false}
                            className={linkButtonClassName("outline", "sm")}
                          >
                            编辑
                          </Link>
                          <Link
                            href={`/admin/events/${event.id}/registrations`}
                            prefetch={false}
                            className={linkButtonClassName("outline", "sm")}
                          >
                            报名管理
                          </Link>
                          <Link
                            href={`/admin/events/${event.id}/projects`}
                            prefetch={false}
                            className={linkButtonClassName("outline", "sm")}
                          >
                            作品管理
                          </Link>
                          <Link
                            href={`/admin/events/${event.id}/judging`}
                            prefetch={false}
                            className={linkButtonClassName("outline", "sm")}
                          >
                            评审管理
                          </Link>
                          {event.published ? (
                            <Link
                              href={`/events/${event.slug}`}
                              prefetch={false}
                              className={linkButtonClassName("outline", "sm")}
                            >
                              预览
                            </Link>
                          ) : (
                            <span className={linkButtonClassName("outline", "sm", "pointer-events-none opacity-60")}>
                              待发布
                            </span>
                          )}
                          <form
                            action={async () => {
                              "use server";
                              const result = await togglePublish({
                                eventId: event.id,
                                published: !event.published,
                              });

                              if (!result.success) {
                                throw new Error(result.error.message);
                              }
                            }}
                          >
                            <Button type="submit" variant="outline" size="sm">
                              {event.published ? "取消发布" : "发布"}
                            </Button>
                          </form>
                          {!event.published ? <EventDeleteButton eventId={event.id} /> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
