/**
 * InfoItem — 通用 label + value 展示块
 *
 * 适用于时间线、报名详情等场景的键值对展示。
 */

export function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background/75 px-4 py-3.5">
      <p className="scoreboard-label text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-6 text-foreground tabular-nums">{value}</p>
    </div>
  );
}
