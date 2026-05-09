import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { listPublishedEvents } from "@/lib/events/queries";
import { formatDateRange } from "@/lib/format";

export default async function Home() {
  const events = await listPublishedEvents();

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Hero */}
      <section className="bg-muted border-b border-border px-6 py-16 text-center lg:px-8 lg:py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground [font-family:var(--font-display-face)] lg:text-4xl">
          与全球开发者竞逐比分，挑战排名
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">
          浏览当前开放中的赛事，查看阶段与时间窗口，报名参赛开启你的挑战之旅。
        </p>
      </section>

      {/* 赛事列表 */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8">
        {events.length === 0 ? (
          <EmptyState
            title="暂时还没有开放赛事"
            description="新的赛事发布后将会展示在这里，敬请关注。"
          />
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                prefetch={false}
                className="group flex flex-col gap-4 rounded-md border border-border bg-card p-5 transition-colors hover:bg-card/80 sm:flex-row sm:items-start sm:gap-6 sm:p-6"
              >
                {/* 左侧：标题 + 描述 + 赛道标签 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {event.name}
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
                          className="inline-flex items-center bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
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
                      <span className="text-xs">奖励</span>
                      <span className="font-medium text-foreground">
                        {summarizePrizes(event.prizes)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">赛期</span>
                    <span className="text-xs tabular-nums text-foreground">
                      {formatDateRange(event.startDate, event.endDate)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
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
