import { type ReactNode } from "react";

/**
 * PageHeaderCard — 页面头部卡片
 *
 * 标签 + 标题 + 描述 + 操作区（可选 badge 行 / 按钮区域）。
 */

export function PageHeaderCard({
  tag,
  title,
  description,
  extra,
  actions,
}: {
  tag?: string;
  title: string;
  description: string;
  extra?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="border border-border bg-card/95 p-6 shadow-sm lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          {tag ? (
            <p className="scoreboard-label inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              {tag}
            </p>
          ) : null}
          <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground lg:text-base">{description}</p>
          {extra ? <div className="pt-1">{extra}</div> : null}
        </div>
        {actions ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
