import { getOptionalSession } from "@/lib/auth-session";
import { MetricCard } from "@/components/metric-card";
import { PageHeaderCard } from "@/components/page-header-card";

const checkpoints = [
  {
    title: "认证与角色",
    description: "Auth.js、OAuth provider、ADMIN_EMAILS 自动角色匹配。",
  },
  {
    title: "赛事管理",
    description: "创建赛事、编辑时间窗口、发布前台可见内容。",
  },
  {
    title: "后续模块",
    description: "报名审核、作品提交、评分与排名将按 Step 2-6 推进。",
  },
];

export default async function AdminDashboardPage() {
  const session = await getOptionalSession();

  return (
    <div className="space-y-6">
      <PageHeaderCard
        tag="后台概览"
        title={`你好，${session?.user?.name ?? session?.user?.email ?? "管理员"}`}
        description="当前后台已完成基础入口、访问保护与导航骨架。接下来优先补赛事 CRUD、报名流转和作品/评分模块。"
        extra={
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="border border-border bg-muted px-3 py-1.5">
              入口已接入
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              双层访问保护
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              控制台导航就绪
            </span>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="基础入口" value="已完成" standalone />
        <MetricCard label="访问保护" value="已完成" standalone />
        <MetricCard label="后续流程" value="报名 / 作品 / 评分" standalone />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {checkpoints.map((item) => (
          <article
            key={item.title}
            className="border border-border bg-card p-5"
          >
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
