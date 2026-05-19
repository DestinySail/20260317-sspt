/**
 * MetricCard — 通用指标卡片
 *
 * 显示 label（小号标签）+ value（大号数值），用于首页/详情页/后台统计概览。
 * 支持两种尺寸：默认嵌入型（无阴影）和 standalone（独立卡片，带阴影）。
 */

export function MetricCard({
  label,
  value,
  standalone,
}: {
  label: string;
  value: string;
  standalone?: boolean;
}) {
  return (
    <div
      className={
        standalone
          ? "border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-px hover:border-primary/35 hover:shadow-md"
          : "border border-border bg-background/70 px-4 py-3"
      }
    >
      <p className="scoreboard-label text-muted-foreground">
        {label}
      </p>
      <p
        className={
          standalone
            ? "mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums [font-family:var(--font-display-face)]"
            : "mt-1 text-base font-semibold text-foreground tabular-nums [font-family:var(--font-display-face)]"
        }
      >
        {value}
      </p>
    </div>
  );
}
