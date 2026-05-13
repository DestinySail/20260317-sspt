# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun install` | 安装依赖 |
| `bun run dev` | 启动开发服务器 |
| `bun run lint` | 运行 ESLint |
| `bun run typecheck` | 运行 TypeScript 类型检查 |
| `bun run test` | 运行所有测试 |
| `bunx vitest run src/lib/access-control.test.ts` | 运行单个测试文件 |
| `bun run lint && bun run typecheck && bun run test` | 完整校验 |
| `bun run db:generate` | 生成 Prisma Client |
| `bun run db:migrate` | 创建并应用迁移 |
| `bun run db:push` | 直接推送 schema 到数据库 |
| `bun run db:studio` | 打开 Prisma Studio 查看数据 |

## 技术栈

- **框架**: Next.js 16.2.0 (App Router)
- **包管理**: Bun
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: Auth.js v5 (JWT + Prisma Adapter)
- **UI**: Tailwind CSS v4 + shadcn/ui
- **表单校验**: Zod
- **测试**: Vitest

## 架构要点

### 认证系统（双层防护）

1. **请求层** (`src/proxy.ts`): 拦截 `/admin/:path*`，未登录用户重定向到登录页
2. **服务端层** (`src/lib/auth-guards.ts`): `requireUser()` 和 `requireAdmin()` 在页面/布局中再次校验

Auth.js 配置分散在三处:
- `src/auth.ts` — NextAuth 实例和 Prisma Adapter
- `src/auth.config.ts` — Providers 与 JWT/session callbacks
- `src/app/api/auth/[...nextauth]/route.ts` — 路由处理器导出

管理员角色来自 `ADMIN_EMAILS` 环境变量，逻辑在 `src/lib/access-control.ts`。

### 数据层

- Prisma schema 在 `prisma/schema.prisma`
- 获取 Prisma Client 统一走 `src/lib/prisma.ts`
- 无 DATABASE_URL 时 `getOptionalPrismaClient()` 返回 null，不影响首页渲染

### Server Action 返回约定

使用 `src/lib/action-result.ts` 定义的标准模式:
- `ok(data)` / `fail(code, message)` 构造返回结果
- `safeAction(input, handler)` 自动捕获异常
- `safeActionWithSchema(schema, input, handler)` 结合 Zod 校验
- 所有 Server Action 应优先沿用这套约定

### 路径别名

`tsconfig.json` 配置了 `@/* -> src/*`，使用别名代替深层相对路径。

### Admin 页面结构

```
src/app/admin/
├── layout.tsx      # Admin 布局（含侧边栏）
├── page.tsx       # Admin 首页
└── events/
    ├── page.tsx               # 赛事列表
    ├── actions.ts             # 赛事 Server Actions
    ├── new/page.tsx           # 新建赛事
    └── [id]/
        ├── edit/page.tsx      # 编辑赛事
        ├── judging/page.tsx   # 评审管理（含排名）
        └── registrations/
            ├── page.tsx       # 报名列表
            └── export/route.ts # 导出 CSV
```

### Judge 评审页面

```
src/app/judge/
├── page.tsx                  # 评委首页（分配的赛事列表）
├── actions.ts                # 评分 Server Actions
└── events/[id]/page.tsx      # 评审项目列表
```

### 用户个人中心

```
src/app/my/
├── registrations/page.tsx    # 我的报名
└── projects/page.tsx         # 我的项目
```

### 赛事阶段系统

赛事阶段定义在 `src/lib/events/phase.ts`：

| 阶段 | 条件 | 可操作 |
|------|------|--------|
| DRAFT | 未发布 | 编辑 |
| UPCOMING | 已发布但报名未开始 | 查看 |
| REGISTRATION | 报名时间内 | 报名 |
| SUBMISSION_PENDING | 报名结束但提交未开始 | - |
| SUBMISSION | 提交时间内 | 提交项目 |
| REVIEW_PENDING | 提交结束但评审未开始 | - |
| REVIEW | 评审时间内 | 评委评分 |
| COMPLETED | 评审结束 | 查看排名（需开启）|

### 评分与排名系统

评分体系定义在 `src/lib/reviews/schema.ts`，排名计算在 `src/lib/reviews/ranking.ts`：
- 每个赛事有独立的评分维度（scoringCriteria）
- 评委对每个项目提交分数（ProjectScore），包含多个维度的得分和评语
- 排名按总分降序，多个评委的平均分作为项目总分
- `rankingsPublished` 字段控制是否公开排名

## 关键文件

| 文件 | 用途 |
|------|------|
| `src/proxy.ts` | Admin 请求层鉴权中间件 |
| `src/lib/auth-guards.ts` | 服务端页面鉴权守卫 |
| `src/lib/action-result.ts` | Server Action 返回类型和工具函数 |
| `src/lib/prisma.ts` | Prisma Client 单例 |
| `src/lib/access-control.ts` | 管理员角色判断逻辑 |
| `src/lib/events/phase.ts` | 赛事阶段计算逻辑 |
| `src/lib/events/schema.ts` | 赛事相关 Zod Schema |
| `src/lib/registrations/schema.ts` | 报名相关 Zod Schema |
| `src/lib/reviews/ranking.ts` | 评分排名计算逻辑 |
| `src/lib/reviews/queries.ts` | 评委/评审数据查询 |

## 环境变量

必需 `.env` 配置: `DATABASE_URL`、`AUTH_SECRET`、`ADMIN_EMAILS`
可选（OAuth 登录）: `AUTH_GITHUB_ID/SECRET`、`AUTH_GOOGLE_ID/SECRET`

详情参考 `.env.sample`。

## 项目约定

- 所有 API 响应必须包含明确错误处理
- 新增后台页面保留双层鉴权防护
- 测试文件与实现文件相邻放置: `src/lib/foo.ts` → `src/lib/foo.test.ts`

@AGENTS.md

## Agent skills

### Issue tracker

GitHub Issues (`DestinySail/20260317-sspt`). See `docs/agents/issue-tracker.md`.

### Triage labels

Standard five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.
