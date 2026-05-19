import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { linkButtonClassName } from "@/lib/button-link";
import { listPublishedEvents } from "@/lib/events/queries";
import { formatDateRange } from "@/lib/format";

export default async function Home() {
  const events = await listPublishedEvents();

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Hero */}
      <section className="border-b border-border/80 px-6 py-14 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="scoreboard-label mb-4 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              赛事中心
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground [font-family:var(--font-display-face)] lg:text-6xl">
              与全球开发者竞逐比分，挑战排名
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
              浏览当前开放中的赛事，查看阶段与时间窗口，报名参赛开启你的挑战之旅。
            </p>
          </div>
          <div className="border border-border bg-card/95 p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">当前开放</p>
            <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-secondary/50 text-center">
              <div className="p-3">
                <p className="text-2xl font-semibold tabular-nums [font-family:var(--font-display-face)]">{events.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">开放赛事</p>
              </div>
              <div className="p-3">
                <p className="text-2xl font-semibold text-primary tabular-nums [font-family:var(--font-display-face)]">AI</p>
                <p className="mt-1 text-xs text-muted-foreground">主题赛道</p>
              </div>
              <div className="p-3">
                <p className="text-2xl font-semibold tabular-nums [font-family:var(--font-display-face)]">Rank</p>
                <p className="mt-1 text-xs text-muted-foreground">公开榜单</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 赛事列表 */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8">
        {events.length === 0 ? (
          <EmptyState
            title="暂时还没有开放赛事"
            description="新的赛事发布后将会展示在这里，敬请关注。"
          />
        ) : (
          <div className="grid gap-4">
            {events.map((event) => {
              const eventHref = event.landingPage
                ? `/events/${event.slug}/landing`
                : `/events/${event.slug}`;

              return (
              <Link
                key={event.id}
                href={eventHref}
                prefetch={false}
                className="group flex relative flex-col gap-4 overflow-hidden rounded-md border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-start sm:gap-6 sm:p-6"
              >
                <span className="absolute inset-x-0 top-0 h-px bg-primary/60 transition-colors group-hover:bg-primary" />
                {/* 左侧：标题 + 描述 + 赛道标签 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight [font-family:var(--font-display-face)]">
                      <span className="text-foreground transition-colors group-hover:text-primary">
                        {event.name}
                      </span>
                    </h2>
                    <EventPhaseBadge phase={event.phase} />
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {event.description}
                  </p>

                  {event.tracks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {event.tracks.map((track) => (
                        <span
                          key={track.name}
                          className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {track.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 右侧：奖励 + 时间 */}
                <div className="flex shrink-0 flex-wrap items-start gap-x-6 gap-y-2 text-sm text-muted-foreground sm:flex-col sm:items-end sm:gap-3">
                  {event.prizes.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">奖励</span>
                      <span className="font-medium text-foreground">
                        {summarizePrizes(event.prizes)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">赛期</span>
                    <span className="text-xs tabular-nums text-foreground">
                      {formatDateRange(event.startDate, event.endDate)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <span className={linkButtonClassName("outline", "sm")}>
                      {event.landingPage ? "查看落地页" : "查看详情"}
                    </span>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function summarizePrizes(prizes: { title: string; amount: string }[]) {
  const withAmount = prizes.filter((p) => p.amount);
  if (withAmount.length > 0) {
    return withAmount.map((p) => p.amount).join(" / ");
  }
  return prizes.map((p) => p.title).join("、");
}
