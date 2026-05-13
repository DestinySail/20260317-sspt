# AI 赛事业务管理平台 — MVP 实施计划 (v2)

> 从零搭建方案 — 基于 CEO Review (SCOPE REDUCTION) 决策
> 审查日期: 2026-03-19 | 模式: SCOPE REDUCTION
> 参考项目: [JunctionApp](https://github.com/hackjunction/JunctionApp) (业务逻辑参考，不 Fork)

## 项目概述

构建一个 AI 赛事管理平台 MVP，支撑核心赛事流程：**赛事配置 → 报名 → 作品提交 → 评委评分 → 排名公示**。

MVP 为**单租户**模式，多租户隔离推迟到 Phase 1.5。

## 技术栈

| 层 | 技术 | 理由 |
|---|------|------|
| 全栈框架 | Next.js 16 (App Router) | SSR + API Routes 一体化，零配置 |
| UI | Tailwind CSS + shadcn/ui | 快速出页面，组件质量高 |
| ORM | Prisma | 类型安全，迁移工具好 |
| 数据库 | PostgreSQL (Neon) | JSONB 处理半结构化数据，免费 0.5GB |
| 认证 | NextAuth.js (Auth.js v5) | 零成本，GitHub/Google 登录 |
| 部署 | Vercel | 零运维，git push 即上线 |
| 测试 | Vitest + Playwright | 单元/集成 + E2E |

## 架构决策记录

| # | 决策 | 选项 | 结论 | 理由 |
|---|------|------|------|------|
| 1 | 开发模式 | Fork JunctionApp / 从零搭建 | 从零搭建 | JunctionApp 用 Node 12/CRA/MUI v4，升级成本 ≥ 重写 |
| 2 | 审查模式 | EXPANSION / HOLD / REDUCTION | REDUCTION | 从零搭建工作量大，必须砍到最小可用 |
| 3 | 租户模型 | 单租户 / 极简多租户 / 完整多租户 | 单租户 | MVP 阶段不需要组织隔离，后续加字段即可 |
| 4 | 数据库 | PostgreSQL / MongoDB / SQLite | PostgreSQL + Neon | 类型安全 + Prisma + JSONB + 外键约束 |
| 5 | Admin 产生 | 环境变量 / 首个注册用户 / 种子脚本 | 环境变量 ADMIN_EMAILS | 最简单最安全，零代码 |
| 6 | 测试策略 | 不写 / 只测核心 / 标准套件 | 标准套件 | 单元 + 集成 + E2E，赛事公正性不能出错 |
| 7 | 状态管理 | Redux / Zustand / RSC | React Server Components | 减少客户端状态，CRUD 应用不需要全局状态库 |
| 8 | API 风格 | GraphQL / REST / Server Actions | Server Actions + Route Handlers | 最简单，Next.js 原生支持 |

## 系统架构

```
  ┌─────────────────────────────────────────────────────┐
  │                    Vercel                             │
  │  ┌───────────────────────────────────────────────┐   │
  │  │           Next.js 16 (App Router)             │   │
  │  │                                               │   │
  │  │  ┌─────────────┐    ┌──────────────────────┐  │   │
  │  │  │  前台页面     │    │  管理后台页面         │  │   │
  │  │  │ /            │    │ /admin/events        │  │   │
  │  │  │ /events      │    │ /admin/registrations │  │   │
  │  │  │ /events/[slug]│   │ /admin/projects      │  │   │
  │  │  │ /submit/[slug]│   │ /admin/scoring       │  │   │
  │  │  │ /rankings/[..]│   │ /admin/rankings      │  │   │
  │  │  └──────┬───────┘    └──────────┬───────────┘  │   │
  │  │         │                       │              │   │
  │  │         ▼                       ▼              │   │
  │  │  ┌──────────────────────────────────────────┐  │   │
  │  │  │     Server Actions + Route Handlers      │  │   │
  │  │  └──────────────────┬───────────────────────┘  │   │
  │  │                     │                          │   │
  │  │              ┌──────▼──────┐                    │   │
  │  │              │   Prisma    │                    │   │
  │  │              └──────┬──────┘                    │   │
  │  └─────────────────────┼──────────────────────────┘   │
  └────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────▼──────┐       ┌──────────────┐
                    │  Neon PG    │       │  NextAuth    │
                    │ (PostgreSQL)│       │ (GitHub/     │
                    └─────────────┘       │  Google)     │
                                          └──────────────┘
```

## 数据模型

### 核心表 (6 张)

```
  User ──────────< Registration >────────── Event
                                              │
                                              ├──< EventJudge >──── User (judge)
                                              │
  User (judge) ──< ProjectScore >── Project ──┘
```

#### Event (赛事)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | String | 赛事名称 |
| slug | String (unique) | URL 标识 |
| description | Text | 赛事描述 (Markdown) |
| startDate | DateTime | 赛事开始 |
| endDate | DateTime | 赛事结束 |
| registrationStart | DateTime | 报名开始 |
| registrationEnd | DateTime | 报名截止 |
| submissionStart | DateTime | 提交开始 |
| submissionEnd | DateTime | 提交截止 |
| reviewStart | DateTime | 评审开始 |
| reviewEnd | DateTime | 评审结束 |
| published | Boolean | 是否公开 |
| rankingsPublished | Boolean | 排名是否已发布 |
| tracks | Json | 赛道配置 |
| challenges | Json | 挑战/赛题 |
| prizes | Json | 奖项/奖金 |
| scoringCriteria | Json | 评分维度配置 [{name, maxScore, weight}] |
| customFields | Json | 自定义报名表单字段 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Registration (报名)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| eventId | UUID → Event | 关联赛事 |
| userId | UUID → User | 关联用户 |
| status | Enum | pending / accepted / confirmed / rejected / cancelled |
| teamName | String? | 队伍名称 |
| answers | Json | 自定义表单字段答案 |
| createdAt | DateTime | 报名时间 |

```
  注册状态机 (5 态):

  pending ──(管理员接受)──▶ accepted ──(选手确认)──▶ confirmed
     │                        │
     └──(管理员拒绝)──▶ rejected    └──(选手取消)──▶ cancelled
```

#### Project (作品)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| eventId | UUID → Event | 关联赛事 |
| submittedBy | UUID → User | 提交者 |
| name | String | 作品名称 |
| description | Text | 作品描述 (Markdown) |
| teamName | String? | 队伍名称 |
| sourceUrl | String? | 源代码链接 |
| demoUrl | String? | 演示链接 |
| videoUrl | String? | 视频链接 |
| track | String? | 参加赛道 |
| challenges | Json | 参加的挑战 |
| status | Enum | draft / final |
| createdAt | DateTime | 提交时间 |
| updatedAt | DateTime | 更新时间 |

#### ProjectScore (评分)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID → Project | 关联作品 |
| judgeId | UUID → User | 评委 |
| eventId | UUID → Event | 关联赛事 |
| scores | Json | 各维度分数 {维度名: 分数} |
| comment | Text? | 评语 |
| createdAt | DateTime | 评分时间 |

**唯一约束**: `(projectId, judgeId)` — 每个评委对每个作品只能评一次

#### EventJudge (评委分配)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| eventId | UUID → Event | 关联赛事 |
| userId | UUID → User | 评委用户 |
| assignedAt | DateTime | 分配时间 |

**唯一约束**: `(eventId, userId)` — 每个评委在每个赛事中只分配一次

#### User (用户 — NextAuth 管理)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | String? | 用户名 |
| email | String (unique) | 邮箱 |
| emailVerified | DateTime? | 邮箱验证时间 |
| image | String? | 头像 URL |
| role | Enum | user / admin (默认 user) |

> Admin 角色通过环境变量 `ADMIN_EMAILS` 自动匹配赋予

## 导航架构

### 全局 Header（AppHeader）

按角色动态展示链接：

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  AI 赛事业务管理平台   首页  [我的报名]  [我的作品]  [管理后台]      [用户/登录] │
  └──────────────────────────────────────────────────────────────────┘
                            ↑ 需登录      ↑ 需登录      ↑ ADMIN only
```

| 链接 | 可见条件 | 目标路由 |
|------|----------|----------|
| 首页 | 始终 | `/` |
| 我的报名 | 已登录 | `/my/registrations` |
| 我的作品 | 已登录 | `/my/projects` |
| 待评审作品 | 已登录 + 当前用户在任意赛事中是评委 | `/judge` |
| 管理后台 | ADMIN | `/admin` |

### Admin Sidebar

后台侧栏按功能分组，所有 `/admin/*` 页面共享：

```
  管理后台
  赛事管理与运营控制台
  ─────────
  📊 概览            /admin
  🏆 赛事管理        /admin/events
```

赛事子页面（报名管理、作品管理、评分管理、排名管理）通过赛事列表表格的"操作"列入口进入，不在 Sidebar 中单独列出。Sidebar 保持顶层入口简洁。

> **注意**：当前 `admin-sidebar.tsx` 的描述文案仍为开发期临时文案（"Step 1 先搭基础框架"），需在 MVP 上线前替换为正式描述。

### 评委入口

评委不是独立的后台角色，而是普通用户被分配为某赛事的评委后获得评审权限：

- 入口 1：Header 中的"待评审作品"链接（仅当该用户在 EventJudge 表有记录时可见）
- 入口 2：`/judge` 页面展示该评委被分配的所有赛事及待评作品
- 入口 3：`/judge/[eventId]` 进入具体赛事的评分界面

评委视角与管理后台完全分离，评委看不到管理功能，管理员看不到评委的评分界面（除非自己也是评委）。

## 用户旅程与情绪支撑

### 参赛者旅程

```
  浏览赛事 ──▶ 提交报名 ──▶ 等待审核 ──▶ 确认参赛 ──▶ 提交作品 ──▶ 等待评审 ──▶ 查看排名
  (好奇)       (期待)       (焦虑)       (兴奋)       (成就感)     (焦虑)       (期待/失落)
```

#### 等待审核阶段（报名 → 录取）

**情绪**：用户提交报名后不知道什么时候有结果，只能自己反复刷新。

**支撑设计**（在"我的报名"卡片中体现）：
- 状态为 PENDING 时，卡片内显示引导文案："管理员会在报名截止后统一审核，请耐心等待。"
- 展示报名截止时间倒计时或已过时间，让用户知道流程节奏
- 展示"下一步"提示："审核通过后，你将在此页面看到'确认参赛'按钮。"

#### 作品提交成功时刻

**情绪**：用户花了很多时间准备作品，提交终稿是一个里程碑。

**支撑设计**（在作品提交页 + 我的作品页体现）：
- 终稿提交成功后，展示绿色完成卡片："🎉 作品已成功提交！"+ 作品名称 + 提交时间
- "我的作品"页面中，终稿状态的卡片用绿色左边框或绿色 Badge 强调完成状态
- 卡片底部展示"下一步"提示："评审阶段将于 {reviewStart} 开启，届时评委将对所有作品进行评分。"

#### 等待评审阶段（提交 → 排名）

**情绪**：这是最长的等待期，用户完全没有进度可见性。

**支撑设计**（在"我的作品"卡片中体现）：
- 评审窗口未开启：显示"评审将于 {reviewStart} 开启"
- 评审进行中：显示"评审进行中，预计 {reviewEnd} 结束"（不暴露具体评分）
- 评审已结束但排名未发布：显示"评审已结束，排名将由管理员发布后公开"
- 以上状态通过 `getEventPhase()` 推断，不需要新增字段

#### 排名公示时刻

**支撑设计**（在排名公示页体现）：
- 获奖作品用金/银/铜色高亮边框或奖杯 emoji 标注
- 页面顶部展示赛事名称 + "恭喜所有参赛者！"暖场文案
- 每个作品可展开查看评分维度详情（透明公正）

### 管理员旅程

管理员的核心情绪是**掌控感**——在任何页面都能快速知道"当前整体进展如何"。

**支撑设计**：
- 后台概览页 `/admin`（当前是占位页）应展示：活跃赛事数、待审核报名数、待评作品数、已发布排名数
- 每个赛事子页面（报名/作品/评分/排名）的页头统计卡片已在交互状态表中定义

### 评委旅程

评委的核心情绪是**明确感**——清楚知道要评多少、评了多少、还剩多少。

**支撑设计**：
- `/judge` 页面的赛事卡片用进度条可视化"已评 X/Y"
- `/judge/[eventId]` 评分界面顶部固定进度条，每评完一个自动前进
- 全部评完后展示完成庆祝卡片 + 评分统计摘要

## 响应式与无障碍设计

### 断点策略

沿用 Tailwind 默认断点，语义定义：

| 断点 | 宽度 | 目标设备 | 布局策略 |
|------|------|----------|----------|
| 默认（无前缀） | < 640px | 手机竖屏 | 单列堆叠，卡片全宽，表格转为卡片列表 |
| `sm` | ≥ 640px | 手机横屏/小平板 | 表单开始双列，页面头部标题+操作同行 |
| `md` | ≥ 768px | 平板竖屏 | 卡片 2 列，Header 导航链接展开 |
| `lg` | ≥ 1024px | 平板横屏/笔记本 | 卡片 2-3 列，后台 sidebar + 主内容并排 |
| `xl` | ≥ 1280px | 桌面 | 最大宽度 `max-w-6xl` 居中 |

### 移动端导航

**当前问题**：Header 导航链接在 `< md` 时被 `hidden` 隐藏，但没有汉堡菜单替代。

**方案**：
- `< md` 时在 Header 右侧显示汉堡按钮（lucide `Menu` 图标）
- 点击后展开 Sheet（shadcn/ui 已有）侧边抽屉，包含所有导航链接 + 用户信息 + 退出按钮
- 后台 Sidebar 在 `< lg` 时折叠为顶部水平导航或同样收入 Sheet

### 关键页面移动端布局

| 页面 | 桌面布局 | 移动端（< 640px）布局 |
|------|----------|----------------------|
| 首页赛事列表 | 2-3 列卡片 grid | 单列全宽卡片，卡片内 MetricCard 横向滚动或 2 列 |
| 赛事详情页 | 左右两栏（内容 + 报名状态卡片） | 报名状态卡片移到标题下方，单列堆叠 |
| 后台赛事列表 | 6 列 Table | **转为卡片列表**：每个赛事一张卡片，赛事名+状态+阶段为主体，操作按钮堆叠在卡片底部 |
| 后台报名管理 | 筛选栏 4 列 + 表格 | 筛选栏堆叠为单列，表格转为卡片（报名人+状态+操作） |
| 评委评分界面 | 左侧进度条 + 右侧评分表单 | 顶部固定进度条，评分表单全宽单列，维度评分纵向排列 |
| 排名公示页 | 前三名大卡片 + 表格 | 前三名单列大卡片，排名表格转为卡片列表（排名+作品名+分数） |

### 后台表格移动端策略

后台管理页面的 Table 在 `< md` 时不使用水平滚动，而是转为**卡片列表视图**：
- 使用 CSS `@media` 或条件渲染切换布局
- 每条数据渲染为一张紧凑卡片，关键信息（名称/状态/操作）可见
- 次要信息（时间/配置数量）折叠或缩减

### 无障碍基础清单

#### 必须做（MVP 必要）

| 项目 | 规范 | 实施方式 |
|------|------|----------|
| 表单 label 关联 | 所有 `<input>` / `<select>` / `<textarea>` 必须有关联 `<label>` 或 `aria-label` | 检查现有表单（报名表单、赛事创建/编辑表单），补齐缺失 label |
| 按钮可达 | 所有可交互元素可用 Tab 键聚焦 | shadcn Button/Input 默认支持，自定义交互区域需加 `tabIndex` |
| 触摸目标 | 可点击元素最小 44×44px | 检查 Badge、小按钮，必要时加 padding |
| 图标按钮文案 | 纯图标按钮必须有 `aria-label` | 如汉堡菜单按钮、删除按钮 |
| 颜色不作为唯一信息通道 | 状态 Badge 不能仅靠颜色区分 | 当前 Badge 有文字标签 ✅，无需改动 |
| 页面 lang 属性 | `<html lang="zh-CN">` | 已实现 ✅ |

#### 建议做（MVP 后）

| 项目 | 规范 |
|------|------|
| ARIA landmark | `<main>`, `<nav>`, `<header>`, `<aside>` 语义标签（部分已用） |
| Skip to content | 键盘用户跳过导航直达内容 |
| Focus visible | 确保 `:focus-visible` 样式在所有组件上可见 |
| 对比度检查 | `text-muted-foreground` 与 `bg-card` 对比度 ≥ 4.5:1 |
| 屏幕阅读器测试 | VoiceOver 通读核心流程 |

## 隐式设计系统（代码推断）

> 项目无 DESIGN.md。以下规范从已实现代码中推断，Step 4-6 实现时必须遵循，不得引入新的视觉模式。
> 后续如需系统化，可运行 `/design-consultation` 生成正式 DESIGN.md。

### 字体

| 用途 | 字体 | CSS 变量 |
|------|------|----------|
| 正文/UI | Geist Sans | `--font-geist-sans` |
| 代码/等宽 | Geist Mono | `--font-geist-mono` |

### 圆角体系

| 层级 | 圆角 | 用于 |
|------|------|------|
| 页面级容器/卡片 | `rounded-3xl` | section、article 外层卡片 |
| 卡片内嵌元素 | `rounded-2xl` | MetricCard、TimelineItem、InfoItem、内嵌信息块 |
| 按钮/输入/Badge | `rounded-lg` 或 shadcn 默认 | Button、Input、Select、Badge |
| 头像/用户标识 | `rounded-full` | AppHeader 用户头像圆 |

### 间距体系

| 场景 | 值 | 示例 |
|------|-----|------|
| 页面外边距 | `px-6 lg:px-8` | 所有前台页面 |
| 页面最大宽度 | `max-w-6xl`（前台）/ `max-w-4xl`（表单页） | 首页、报名页 |
| 页面垂直 padding | `py-10` | 所有前台页面 |
| 卡片间距 | `gap-6` 或 `gap-8` | 页面内 section 间 |
| 卡片内 padding | `p-6`（标准）/ `p-8`（头部 hero 卡片）/ `p-5`（紧凑） | — |
| 元素间距 | `gap-3`（紧凑）/ `gap-4`（标准）/ `gap-6`（宽松） | — |
| 标题与内容 | `space-y-2`（紧凑标题组）/ `space-y-3`/`space-y-4`（标准） | — |

### 颜色语义

基于 shadcn/ui CSS 变量，不直接使用 hex 值：

| 语义 | 类名 | 用于 |
|------|------|------|
| 主背景 | `bg-background` | body |
| 卡片背景 | `bg-card` | 所有卡片 |
| 主文本 | `text-foreground` | 标题、重要数据 |
| 次要文本 | `text-muted-foreground` | 描述、标签、时间 |
| 边框 | `border-border` | 卡片边框、分隔 |
| 虚线边框 | `border-dashed border-border` | 空状态容器 |
| 主色 | `text-primary` / `bg-primary` | 按钮、高亮标识 |
| 阴影 | `shadow-sm` | 所有卡片统一 |

### 排版层级

| 层级 | 样式 | 用于 |
|------|------|------|
| 页面标题 | `text-3xl` 或 `text-4xl font-semibold tracking-tight` | h1 |
| 区块标题 | `text-xl font-semibold` 或 `text-2xl font-semibold` | h2 |
| 标签/前缀 | `text-sm font-medium text-muted-foreground` | 面包屑、分类标签 |
| 正文描述 | `text-sm leading-7 text-muted-foreground` 或 `text-base leading-7/8` | 段落描述 |
| 小标签 | `text-xs uppercase tracking-wide text-muted-foreground` | MetricCard label |
| 数据值 | `text-lg font-semibold` 或 `text-2xl font-semibold` | MetricCard value |

### 组件约定

| 组件 | 来源 | 备注 |
|------|------|------|
| Button, Badge, Table, Input, Select, Dialog, Tabs, etc. | shadcn/ui (`@/components/ui/*`) | 不自造同类组件 |
| 图标 | lucide-react | 按需引入，不批量导入 |
| 链接按钮 | `linkButtonClassName()` (`@/lib/button-link`) | Link 样式统一入口 |
| Toast/通知 | **不引入** — 保持 Server Action + 页面刷新模式 | 评分提交后自动跳转下一个作品即为成功反馈；如后续需要再引入 sonner |

### 待抽取共用组件（实现 Step 4 前完成）

| 组件 | 当前状态 | 抽取方案 |
|------|----------|----------|
| `formatDate` / `formatDateRange` | 在 4 个页面文件内重复定义 | 抽取到 `src/lib/format.ts` |
| `MetricCard` | 首页、详情页、报名管理各自定义 | 抽取到 `src/components/metric-card.tsx` |
| `InfoItem` / `TimelineItem` | 详情页、我的报名各自定义 | 统一为 `src/components/info-item.tsx`（label + value 的通用展示块） |
| 空状态组件 | 各页面内联 JSX | 抽取到 `src/components/empty-state.tsx`（标题 + 描述 + 可选操作按钮） |
| 页面头部卡片 | 各页面内联，结构一致（标签 + 标题 + 描述 + 操作区） | 抽取到 `src/components/page-header-card.tsx` |

## 差异化设计指引（Anti-Slop）

> 以下 3 个页面是用户接触频率最高的，实现时需刻意打破"卡片网格 + 表格"的模板感。

### 1. 首页赛事列表 `/`

**当前问题**：3 列 grid 卡片 + MetricCard 数字指标，跟任意 SaaS 模板无法区分。

**差异化方向**：
- 赛事卡片不要平铺 3 列等权重。如果只有 1-2 个赛事（MVP 常态），单列大卡片比 3 列空荡更有力
- 当前赛事阶段是最重要的信息——用颜色/图标/进度条让"报名中"/"作品提交中"/"评审中"在视觉上成为卡片的主角，而非角落里的小 Badge
- 赛事时间线用水平时间轴替代纯文本日期范围（"报名 ──●── 提交 ──○── 评审 ──○── 结束"），一眼看出当前阶段
- 数字指标（赛道数/奖项数/评分维度数）对参赛者意义不大，考虑替换为"已报名 X 人"等动态数据

### 2. 评委评分界面 `/judge/[eventId]`

**风险**：最容易做成"标准表单 + 滑块/数字输入"的纯工具页面。

**差异化方向**：
- 评委的核心体验是"逐个作品深入审阅"而非"快速批量打分"。布局采用**单作品聚焦模式**：页面主体只展示当前作品详情 + 评分表单，而非列出所有作品的表格
- 左侧或顶部固定窄条显示进度（作品缩略列表 + 已评/待评状态），右侧/主体展示当前作品
- 评分维度用直观的刻度条或星级，而非裸数字输入框——每个维度带一行描述提示评委关注什么
- 评完最后一个作品后的完成页面是评委对平台的最后印象——做得比"评审完成"四个字更有仪式感

### 3. 排名公示页 `/events/[slug]/rankings`

**风险**：做成一个普通数据表格，跟 Excel 导出没区别。

**差异化方向**：
- 前三名用大卡片突出展示（作品名 + 队伍 + 总分 + 奖项标记），而非表格前三行
- 表格部分从第 4 名开始，视觉权重低于前三名区域
- 如果赛事有多个赛道，用 Tab 切换或手风琴折叠，而非一个超长表格
- 每行可展开查看各维度分数详情，默认折叠——用户先看排名结果，再按需看细节
- 页面顶部用赛事名称 + 参赛统计（X 个作品 / Y 位评委 / Z 维度）做"仪式感"头部，而非直接开始表格

## 全局交互状态约定

> 以下约定适用于所有页面，Step 4-6 各功能的具体状态表见对应 Step 章节。

### 通用 Loading 策略
- 所有列表/详情页使用 React Server Component 直出，无客户端 loading spinner
- 表单提交使用 `useFormStatus` 的 `pending` 态禁用按钮 + 显示"提交中…"文案
- 批量操作（接受/拒绝、发布/取消发布）提交期间禁用操作按钮

### 通用空状态模式
- 外观：`rounded-3xl border-dashed border-border bg-card p-10 text-center shadow-sm`
- 结构：标题（2xl semibold）+ 说明文案（sm muted）+ 主操作按钮（如有）
- 语气：温暖引导，不用"没有数据"，而用"还没有 X，Y 之后会出现在这里"

### 通用错误状态模式
- Server Action 失败：通过 `ActionResult.error` 返回，页面内联展示错误卡片（红色边框 + 错误信息 + 重试/返回操作）
- 权限不足（非 confirmed、非评委、非 admin）：提示卡片说明原因 + 引导到正确路径
- 时间窗口外：提示卡片说明窗口状态 + 显示具体开启/截止时间

### 已实现页面交互状态覆盖（Step 1-3）

| 功能 | EMPTY | ERROR | PARTIAL |
|------|-------|-------|---------|
| 首页赛事列表 | ✅ "暂时还没有已发布赛事"+ admin 可见"去创建赛事" | — | — |
| 赛事详情页 | — | ✅ 未找到 → notFound() | ✅ 报名状态卡片按 5 种入口状态展示 |
| 报名表单页 | ✅ 空表单 | ✅ 已报名/窗口关闭/非登录 三种拦截 | — |
| 我的报名页 | ✅ "你还没有提交任何报名"+ "去看赛事" | — | ✅ 多报名卡片列表 + 按状态展示操作 |
| 后台赛事列表 | ✅ "还没有赛事"+ "立即创建" | — | — |
| 后台报名管理 | ✅ 表格空行（AdminRegistrationReviewTable 内部处理） | — | ✅ 状态统计卡片 + 筛选 |

## 页面路由

### 前台 (公开 + 已登录用户)

| 路由 | 页面 | 认证 |
|------|------|------|
| `/` | 首页 — 赛事列表 | 公开 |
| `/events/[slug]` | 赛事详情 + 报名入口 | 公开 |
| `/events/[slug]/register` | 报名表单 | 需登录 |
| `/events/[slug]/submit` | 作品提交 | 需登录 + confirmed |
| `/events/[slug]/rankings` | 排名公示 | 公开 |
| `/my/registrations` | 我的报名 | 需登录 |
| `/my/projects` | 我的作品 | 需登录 |

### 评委视图 (被分配为评委的已登录用户)

| 路由 | 页面 | 认证 |
|------|------|------|
| `/judge` | 待评审赛事总览 — 展示该评委被分配的所有赛事及评审进度 | 需登录 + EventJudge 记录 |
| `/judge/[eventId]` | 单赛事评分界面 — 单作品聚焦模式，逐个评审 | 需登录 + 该赛事 EventJudge 记录 |

> 评委路由独立于前台和管理后台。评委看不到管理功能，管理员看不到评委界面（除非自己也是评委）。
> 无 EventJudge 记录的用户访问 `/judge` 将看到"你当前没有被分配为评委"的空状态提示。

### 管理后台 (Admin only)

| 路由 | 页面 |
|------|------|
| `/admin` | 管理后台首页 (概览) |
| `/admin/events` | 赛事管理列表 |
| `/admin/events/new` | 创建赛事 |
| `/admin/events/[id]/edit` | 编辑赛事 |
| `/admin/events/[id]/registrations` | 报名管理 (审核/导出) |
| `/admin/events/[id]/projects` | 作品管理 (查看/导出) |
| `/admin/events/[id]/scoring` | 评分管理 (分配评委 + 查看评分进度) |
| `/admin/events/[id]/rankings` | 排名管理 (查看/发布) |

## 实施步骤

### Step 1: 项目脚手架 (Day 1)

**目标**: 项目初始化，核心基础设施就位，能跑起来。

- [x] 创建 Next.js 16 项目 (App Router + TypeScript)
- [x] 安装并配置 Tailwind CSS + shadcn/ui
- [x] 安装并配置 Prisma + 连接 Neon PostgreSQL
- [x] 定义 Prisma Schema (Auth + 赛事核心表)
- [x] 生成首个 migration SQL，并将初始表结构写入 Neon 开发库
- [x] 安装并配置 NextAuth.js v5 (GitHub + Google provider)
- [x] 实现 Admin 角色自动匹配 (ADMIN_EMAILS 环境变量)
- [x] 基础布局组件 (Header + Admin Sidebar + Admin Shell)
- [x] 配置 Vitest 测试框架并补首批单测
- [x] 实现 `proxy.ts` 路由保护 (`/admin/*` 需 admin 角色)
- [x] Server Action 统一返回类型 `ActionResult<T>` + `safeAction` wrapper
- [x] 验证: 本地 `dev/build/lint/typecheck/test` 通过，OAuth provider 已加载

**Step 1 完成说明**

- 当前项目实际运行在 `Next.js 16.2.0`，因此将原计划中的 `middleware.ts` 调整为 `proxy.ts`
- Neon 数据库已连通，Prisma schema 已验证通过，初始 SQL migration 已执行并创建核心表
- Google / GitHub provider 已在 `/api/auth/providers` 返回，后台未登录保护已在本地冒烟验证通过
- 已通过 `/setup-browser-cookies` 导入 `localhost` 管理员会话并验证 `/admin/events` 可访问；后续仍需系统化补齐 provider 细节、未登录回退与认证异常场景 QA

**Step 2 当前进度（2026-03-20，项目进度存档）**

1. 已完成功能：`/admin/events` 列表页、`/admin/events/new` 创建页、`/admin/events/[id]/edit` 编辑页、首页赛事列表、赛事详情页，以及 `createEvent / updateEvent / togglePublish / deleteEvent`、slug 生成、赛事阶段计算、时间窗口顺序校验、安全删除策略
2. 已完成 review：pre-landing `/review` 已执行，发现并修复“编辑页时间字段因服务端时区导致的回填偏移”P1 问题；对应修复与回归测试已落地，并通过 `lint / typecheck / test`
3. 已完成 QA：管理员登录态下已补跑 create / edit / publish / unpublish / delete 主链路、非法表单校验、slug 边界样本、空配置详情页展示，以及“存在关联数据时删除被阻止”的真实后台验证；acceptance 记录已同步回写
4. 当前 Step 2 功能与使用层面的验收已完成；剩余事项仅为历史验收数据去留这类非阻塞收尾，不影响继续进入 Step 3
5. 按当前决策，Step 2 剩余非阻塞收尾项统一延期到 Step 3 开发完成后处理

### Step 2: 赛事管理 (Day 2-3)

**目标**: 管理员可以创建、编辑、发布赛事，前台可以浏览赛事；并在进入 Step 3 前补齐 review / qa 收尾。

- [x] 管理后台: 赛事列表页 (`/admin/events`)
- [x] 管理后台: 创建赛事表单 (`/admin/events/new`)
  - 基础信息 (名称/描述/时间段)
  - 赛道/赛题配置 (JSON 编辑)
  - 奖项配置
  - 评分维度配置 [{name, maxScore, weight}]
  - 自定义报名表单字段
- [x] 管理后台: 编辑赛事 (`/admin/events/[id]/edit`)
- [x] 管理后台: 删除 / 归档赛事策略（当前实现为“仅未发布且无关联数据的草稿可删除”）
- [x] 管理后台: 发布/取消发布赛事
- [x] 前台: 赛事列表页 (`/`) — 仅显示已发布赛事
- [x] 前台: 赛事详情页 (`/events/[slug]`)
  - 赛事描述、时间线、赛道、奖项
  - 报名按钮 (时间窗口内)
- [x] Server Actions: createEvent, updateEvent, togglePublish
- [x] Server Actions: deleteEvent（安全删除草稿赛事）
- [x] 时间窗口顺序校验 (Zod refine: regStart < regEnd ≤ subStart < subEnd ≤ revStart < revEnd)
- [x] getEventPhase() 纯计算函数 (从时间窗口推断赛事阶段)
- [x] Slug 生成 + 冲突自动重试
- [x] Happy path 验证: 管理员创建赛事 → 发布 → 在前台看到 → 详情页可访问
- [x] 编辑页时间回填时区问题修复（在客户端按浏览器时区标准化 `datetime-local`）

#### Step 2 Review / QA 收尾计划

- [x] Pre-landing review / diff review：
  - 已对 Step 2 相关改动执行结构化 review，范围覆盖 `actions / queries / schema / event-form / admin pages`
  - review 结果中已确认并修复编辑页时区回填 P1 问题；修复已补测试并归档到 `RESOLVED_ISSUES.md`
- [x] Authenticated admin flow QA：
  - 已导入 `localhost` 管理员登录态并验证 `/admin/events`、`/admin/events/new`、`/admin/events/[id]/edit`
  - 已完成 create → publish → home visible → detail visible → edit sync → unpublish → home hidden 回归
  - 已验证未发布草稿可删除、已发布状态不展示删除按钮
- [x] 非法表单校验 QA：
  - 已覆盖非法时间顺序、重复评分维度名称、`select` 类型自定义字段无选项
  - 已覆盖空赛道 / 空赛题 / 空奖项赛事发布后前台详情页不崩
- [x] slug / 边界 QA：
  - 已覆盖空白名称、英文名称、中文改名后 slug 更新、旧 slug 失效、纯符号名称 fallback 行为
  - 已确认并接受当前策略：纯符号名称 `!!` 生成 `/event`；中文 / 纯数字名称可读性保持现状，不作为当前阻塞项
- [x] acceptance 收尾：
  - `acceptance/step-2-events-checklist.md` 与 `acceptance/step-2-events-manual-script.md` 已补齐三轮实际执行记录
  - 已标明“已通过 / 未覆盖 / 已知风险 / 待确认策略”
- [x] Step 2 最后一项 QA 缺口：
  - 已补齐“已有报名 / 作品 / 评分 / 评委分配数据时删除被阻止”的真实手工验证
  - 通过 QA 脚本构造报名关联数据，再经真实后台删除入口确认前端收到阻止提示，验证完成后已清理测试数据

#### 当前非阻塞遗留 / 延期项

- ~~数据库中仍保留一条历史验收赛事 `管理员流程回归赛 2026`（已发布），需决定保留还是清理~~ — 2026-04-27 已通过 Prisma 一次性脚本清理（关联数据为零，安全删除），归档至 `RESOLVED_ISSUES.md`

#### 下一步最高优先级

1. 进入 Step 3 报名流程开发
2. ~~Step 3 完成后再回头处理历史验收赛事 `管理员流程回归赛 2026` 的去留~~ — 已于 2026-04-27 清理
3. 若 Step 3 开发中产生新的验收数据，再统一整理 Step 2 / Step 3 的测试数据清理策略

#### 旧计划校正（与实际代码 / 验收记录对齐）

- 旧计划中“编辑页未实现 / 删除策略未定义”已过期：这两项功能已实现并完成主要 QA
- 旧计划中“authenticated admin flow QA 尚未执行”已过期：create / edit / publish / unpublish / delete / 负向校验已完成，当前只剩删除拦截真实数据场景
- 旧计划中“acceptance 待补 edit / delete / unpublish 回写”已过期：对应 acceptance 文件已同步到第三轮 QA 结果
- 旧计划中“slug 策略待确认”已过期：用户已接受当前 slug 行为，不再阻塞 Step 3
- 旧计划中“Step 2 仍有功能级缺口”已过期：当前仅剩非阻塞收尾项，并已明确延期到 Step 3 完成后处理

### Step 3: 报名流程 (Day 3-4)

**目标**: 用户可以报名，管理员可以审核；当前核心功能已完成，review / qa / acceptance 收尾中。

- [x] 前台: 报名表单页 (`/events/[slug]/register`)
  - 动态渲染自定义表单字段
  - 支持填写队伍名称 (可选)
  - 提交后状态默认为 pending
- [x] 前台: 我的报名页 (`/my/registrations`)
  - 查看报名状态
  - accepted 状态可确认参加 → confirmed
  - 可取消报名
- [x] 管理后台: 报名管理页 (`/admin/events/[id]/registrations`)
  - 报名列表 + 筛选/搜索
  - 批量操作: 接受 / 拒绝
  - 导出报名数据 (CSV)
- [x] Server Actions: createRegistration, updateRegistrationStatus, confirmRegistration, cancelRegistration
- [x] 状态转换校验: 确保只能按合法路径转换
- [x] 抽取 `src/lib/registration-status.ts` 状态机纯函数 (canTransition, canCancelRegistration, canConfirmRegistration)
- [x] 赛事详情页 / 我的报名 / 后台快捷入口联动已完成

**Step 3 当前进度（2026-03-21，项目进度存档）**

1. 已完成功能：报名表单页、我的报名页、后台报名管理页、CSV 导出、报名状态机、报名入口状态判断、管理员可见报名入口、头部“我的报名”导航，以及对应的 server actions / schema / query / 组件层均已落地
2. 已完成 review：已执行一次 Step 3 pre-landing diff review，并定位/修复两个高优先级缺陷——“自定义字段按索引匹配导致字段调整后静默串值”与“并发重复报名返回通用错误而非明确冲突提示”
3. 已完成 QA：`bun run lint && bun run typecheck && bun run test` 已通过；浏览器联调已覆盖管理员报名入口可见性、stale 表单提交拦截、双标签页重复报名冲突提示等关键场景
4. 当前阻塞 / 风险：Neon 数据库仍存在间歇性不可达，导致 live QA 需要重试；当前验收赛事数据里存在 `registrationStart < startDate` 的历史样本，使用后台编辑页做扰动型 QA 时容易触发表单校验失败；Step 3 对应 acceptance 结果尚未正式回写到 `acceptance/`
5. 下一步最高优先级：补齐 Step 4 的 live QA 与 acceptance 回写，确认 confirmed 用户提交作品、后台查看与 CSV 导出链路，再进入 Step 5 评分系统
6. 与实际代码、验收记录不一致的旧计划项：旧计划中“Step 3 未开始 / 报名页与后台报名管理尚未实现 / review 与 QA 尚未规划”均已过期；当前真实状态是“核心开发完成，剩余为验收归档与环境稳定性收尾”

#### Step 3 Review / QA 收尾计划

- [x] Pre-landing review / diff review：已完成代码审查，并依据审查结果修复字段身份匹配与重复报名冲突提示两个缺陷
- [x] Authenticated admin flow QA：已验证管理员账号可在赛事详情页看到报名入口、进入报名页、提交报名并在“我的报名”查看记录
- [x] 非法表单校验场景：已通过浏览器复测 stale 字段提交被拦截；`required / url / select / stale fieldId / duplicate fieldId` 已由单元测试覆盖
- [x] 并发 / 冲突场景回归：已用双标签页复测重复报名，第二次提交返回明确冲突提示，不再落成通用错误
- [x] acceptance 结果回写与收尾：验收清单已归档至 `acceptance/step-3-registration-checklist.md`

### Step 3.5: 共用组件抽取（Step 4 前置）

**目标**: 消除跨页面重复代码，为 Step 4-6 提供统一的 UI 基础组件。

- [x] 抽取 `src/lib/format.ts`（formatDate / formatDateRange），替换 7 个文件的内联定义
- [x] 抽取 `src/components/metric-card.tsx`，替换首页/详情页/报名管理的重复定义
- [x] 抽取 `src/components/info-item.tsx`（label + value 通用展示块），替换 InfoItem / TimelineItem
- [x] 抽取 `src/components/empty-state.tsx`（标题 + 描述 + 可选操作按钮），替换各页面内联空状态 JSX
- [x] 抽取 `src/components/page-header-card.tsx`（标签 + 标题 + 描述 + 操作区），替换各页面头部卡片
- [x] 移动端 Header 汉堡菜单：`< md` 时显示 Menu 图标按钮，点击展开导航面板
- [x] 替换 `admin-sidebar.tsx` 开发期临时文案为正式描述
- [x] 验证: `bun run lint && bun run typecheck && bun run test` 通过

### Step 4: 作品提交 (Day 4-5)

**目标**: confirmed 的参赛者可以提交作品。

#### 交互状态定义

| 功能 | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|------|---------|-------|-------|---------|---------|
| 作品提交页 `/events/[slug]/submit` | Server Component 直出，无客户端 loading | 首次进入：空表单 + 赛事名称/赛道/提交截止时间概览卡片 | 非 confirmed 用户：提示"需要先获得报名确认才能提交作品"+ 返回按钮；时间窗口外：提示"提交窗口尚未开启/已关闭"+ 具体时间 | 提交成功：页面刷新展示已提交状态 + "前往我的作品"链接 | 草稿状态：表单已填数据回显 + 顶部橙色 Badge"草稿 — 截止前可继续编辑"；终稿状态：表单回显 + 顶部绿色 Badge"已提交终稿"，截止前仍可继续编辑并重新提交 |
| 我的作品页 `/my/projects` | Server Component 直出 | 零作品：虚线边框卡片"你还没有提交任何作品"+ 说明文案"先确认参赛后即可提交"+ 主按钮"去看赛事" | — | — | 多个作品（跨赛事）：按赛事分组的卡片列表，每张卡片展示作品名、赛事名、状态 Badge（草稿/终稿）、提交时间 |
| 后台作品管理 `/admin/events/[id]/projects` | Server Component 直出 | 零作品：虚线边框区域"本赛事暂无作品提交"+ 说明"选手确认参赛并在提交窗口内提交后会出现在这里" | — | 导出 CSV 成功：浏览器直接下载 | 有作品：表格列出作品名、提交者、队伍、赛道、状态、提交时间；筛选栏支持按赛道/状态过滤 |

- [x] 前台: 作品提交页 (`/events/[slug]/submit`)
  - 填写作品信息 (名称/描述/链接)
  - 选择赛道/挑战
  - 保存草稿 / 提交终稿
  - 时间窗口外禁止提交
- [x] 前台: 我的作品页 (`/my/projects`)
  - 查看已提交作品
  - 在截止前可编辑
- [x] 管理后台: 作品管理页 (`/admin/events/[id]/projects`)
  - 作品列表 + 筛选
  - 查看作品详情
  - 导出作品数据 (CSV)
- [x] Server Actions: createProject, updateProject, submitProject (draft→final)
- [x] 权限校验: 只有 confirmed 的用户才能提交
- [x] 时间窗口校验: submissionStart ≤ now < submissionEnd
- [x] 验证: confirmed 用户提交作品 → 管理员能看到

**Step 4 当前进度（2026-03-21，项目进度存档）**

1. 已完成功能：作品提交页、我的作品页、后台作品管理页、CSV 导出、Header“我的作品”导航、赛事详情页作品提交入口联动，以及对应的 server actions / schema / query / 组件层均已落地
2. 已完成校验：`bun run lint`、`bun run typecheck`、`bun run test` 全部通过；新增单元测试覆盖作品表单 schema、提交窗口 helper、项目状态 helper 与后台筛选解析
3. 已完成 live QA：在真实数据库与浏览器登录态下跑通了 confirmed 用户保存草稿、提交终稿、截止前更新终稿，以及“我的作品”、后台详情、状态筛选和 CSV 导出，并在结束后恢复了临时测试数据
4. 当前收尾状态：Step 4 主链路的代码、自动化校验、验收清单和 QA 报告都已归档；如果后续继续回归，可再单独补一个“非 confirmed 用户”与“提交窗口已结束”的 spot check
5. 关键实现口径：终稿不是锁定态；在 `submissionEnd` 前，用户仍可继续编辑并再次提交终稿；点击“保存草稿”会把当前内容降级保存为草稿

### Step 5: 评分系统 (Day 5-6)

**目标**: 评委可以对作品打分，支持多维度评分。

#### 交互状态定义

| 功能 | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|------|---------|-------|-------|---------|---------|
| 后台评分管理 `/admin/events/[id]/scoring` | Server Component 直出 | 零评委：虚线边框"尚未分配评委"+ 说明"通过邮箱搜索已注册用户并分配为本赛事评委"+ 分配入口；零作品："本赛事暂无已提交作品，分配评委后也无法开始评审" | 分配评委失败（邮箱未注册）：表单内联错误"未找到该邮箱对应的注册用户" | 分配评委成功：评委列表刷新 + 新评委出现在列表中 | 评分进度：进度条"已评 12/30 个作品"+ 每个评委单独显示"已评 X/Y" |
| 评委待评列表 `/judge` | Server Component 直出 | 零分配：虚线边框卡片"你当前没有被分配为任何赛事的评委"+ 说明"管理员分配后会自动出现在这里" | — | — | 多赛事：按赛事分组的卡片，每张显示赛事名、评审窗口时间、进度"已评 X/Y 个作品" |
| 评委评分界面 `/judge/[eventId]` | Server Component 直出 | 全部评完：绿色完成卡片"🎉 你已完成本赛事所有作品的评审"+ 评分统计概览 | 时间窗口外：提示"评审窗口尚未开启/已关闭"+ 具体时间；提交评分失败：表单内联错误提示 | 单个作品评分提交成功：Server Action 完成后自动跳转到下一个待评作品（跳转本身即成功反馈） | 评了一半：待评作品列表中已评项显示 ✓ + 分数，未评项显示"待评审"；页面顶部展示进度"已评 X/Y" |

- [x] 管理后台: 评分管理页 (`/admin/events/[id]/scoring`)
  - 显示评分进度 (已评/总数)
  - 分配评委 (通过邮箱邀请 — MVP 直接将用户标记为评委)
  - 查看各评委评分详情
- [x] 评委视图: 待评赛事总览 (`/judge`)
  - 展示该评委被分配的所有赛事 + 各赛事评审进度
  - 无分配时显示空状态引导
- [x] 评委视图: 单赛事评分界面 (`/judge/[eventId]`)
  - 单作品聚焦模式：页面主体展示当前作品详情 + 评分表单
  - 逐项评分 (按赛事配置的评分维度)
  - 填写评语 (可选)
  - 提交后自动跳转下一个待评作品
- [x] Server Actions: assignJudge (写入 EventJudge 表), submitScore, getScoreSummary
- [x] 唯一约束: 每个评委对每个作品只评一次
- [x] 评分时间窗口: reviewStart ≤ now ≤ reviewEnd
- [x] 评分维度匹配校验 (scores key 必须与 scoringCriteria name 一致)
- [x] 抽取 lib/scoring.ts 纯函数 (calculateWeightedScore, calculateRankings)
- [x] 验证: 评委打分 → 管理员查看评分结果

**Step 5 当前进度（2026-03-22，项目进度存档）**

1. 已完成功能：管理后台评分管理页、评委待评赛事总览页、单赛事评分界面，以及对应的 server actions / schema / query / 组件层均已落地
2. 已完成校验：`bun run lint`、`bun run typecheck`、`bun run test` 全部通过
3. 已完成 live QA：在真实数据库与浏览器登录态下跑通了评委分配、评分提交、进度展示等核心流程
4. 关键实现口径：采用单作品聚焦模式，评委评完一个作品后自动跳转到下一个待评作品，提供流畅的评审体验

### Step 6: 排名系统 (Day 6-7)

**目标**: 自动计算排名，可公开展示。

#### 交互状态定义

| 功能 | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|------|---------|-------|-------|---------|---------|
| 后台排名管理 `/admin/events/[id]/rankings` | Server Component 直出 | 零作品/零评分：虚线边框"无法生成排名"+ 说明"需要至少 1 个作品完成评审后才能查看排名" | — | 发布成功：排名表格上方绿色 Banner"排名已发布到前台"+ "取消发布"按钮 | 评分不完整：黄色警告 Banner"⚠️ X 个作品尚未完成全部评委评审，当前排名基于已有评分计算"+ 已完成/未完成作品数统计 |
| 前台排名公示 `/events/[slug]/rankings` | Server Component 直出 | 排名未发布：提示卡片"排名尚未公布"+ 说明"管理员发布后即可在此查看完整排名"+ 返回赛事详情按钮 | — | 已发布：排名表格 + 按赛道分组的 Tab 切换 + 奖项高亮 | — |

- [x] 排名计算逻辑:
  - 每个作品的最终得分 = 各评委评分的加权平均
  - 加权方式: 按评分维度的 weight 加权
  - 排名按最终得分降序
- [x] 管理后台: 排名管理页 (`/admin/events/[id]/rankings`)
  - 查看完整排名 (含各维度详细分数)
  - 发布/取消发布排名
  - 导出排名 (CSV)
- [x] 前台: 排名公示页 (`/events/[slug]/rankings`)
  - 仅在管理员发布后可见
  - 显示排名、作品名、队伍名、总分
  - 按赛道/挑战分组展示
- [x] Server Actions: calculateRankings, publishRankings
- [x] 无评分作品不参与排名，管理员页面显示警告
- [x] 验证: 所有评委评分完成 → 查看排名 → 发布排名

**Step 6 当前进度（2026-03-22，项目进度存档）**

1. 已完成功能：排名计算逻辑、管理后台排名管理页、前台排名公示页，以及对应的 server actions / schema / query / 组件层均已落地
2. 已完成校验：`bun run lint`、`bun run typecheck`、`bun run test` 全部通过
3. 已完成 live QA：在真实数据库与浏览器登录态下跑通了排名计算、发布/取消发布、前台公示等核心流程
4. 关键实现口径：排名基于评委评分的加权平均，支持按赛道分组展示，管理员可控制排名的发布状态

### Step 7: 测试 (Day 7-8)

**目标**: E2E 测试覆盖完整流程，CI 配置，补齐测试漏洞。

- [x] 安装配置 Playwright (E2E)
- [x] E2E 测试:
  - [x] 管理员创建赛事 → 发布 → 前台可见
  - [x] 用户报名 → 管理员接受 → 用户确认 → 提交作品
  - [x] 评委评分 → 排名计算 → 管理员发布 → 前台可见（含非评审窗口阻断 + 多评委榜单 spot check）
- [x] CI 配置 (GitHub Actions): push 时自动运行 lint + typecheck + Vitest + Playwright
- [x] 验证: 所有测试通过，CI Run 23422018389 全量绿灯

**Step 7 当前进度（2026-03-23，项目进度存档）**

1. 已完成：Playwright 依赖与配置、`e2e/helpers/` 工具层（cookie 注入/reset-seed/phase-shift/UI）、3 条主流程 spec、Vitest 补强（81 tests）、GitHub Actions workflow（PostgreSQL service container `sspt_e2e`）、Step 5 边界项关闭、Step 7 验收文档
2. CI 全量绿灯：lint ✓ typecheck ✓ Vitest 81 tests ✓ Playwright 3 specs ✓
3. 本地 E2E 实跑需隔离测试库（数据库名含 `test` 或 `e2e`）；2026-04-27 已通过新增 `E2E_DATABASE_URL` 覆盖机制解锁——开发库 `DATABASE_URL` 可保持 `neondb` 不变，`E2E_DATABASE_URL` 单独指向测试库，`bun run e2e:reset` 与 `bun run test:e2e` 都会切换到测试库，CI 行为不变

### Step 8: 部署上线 (Day 8)

**目标**: 生产环境可访问。

- [x] Neon 数据库创建生产实例
- [x] NextAuth 配置生产环境 (OAuth 回调 URL)
- [x] Vercel 项目创建 + 环境变量配置
  - DATABASE_URL
  - NEXTAUTH_SECRET
  - NEXTAUTH_URL
  - GITHUB_ID / GITHUB_SECRET
  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
  - ADMIN_EMAILS
- [x] `git push` 自动部署
- [x] 域名配置 (Vercel 免费 .vercel.app 域名)
- [x] 冒烟测试:
  - [x] 创建赛事 → 发布
  - [x] 用户报名 → 审核 → 确认
  - [x] 提交作品
  - [x] 评委评分
  - [x] 查看排名

**Step 8 当前进度（2026-05-13，项目进度存档）**

1. 已完成：Neon 生产数据库创建、Vercel 项目部署、环境变量配置、生产环境冒烟测试
2. 生产地址：https://sspt-ai.vercel.app/
3. MVP 全量交付完成

---

## 安全设计

| 项目 | 方案 | 状态 |
|------|------|------|
| 认证 | NextAuth JWT + OAuth providers | 框架保障 |
| Admin 鉴权 | ADMIN_EMAILS 环境变量 + middleware | Step 1 实现 |
| 路由保护 | Next.js middleware + Server Action 校验 | 每个 Step 实现 |
| XSS 防护 | React 默认转义 | 框架保障 |
| CSRF 防护 | Server Actions 内置 CSRF token | 框架保障 |
| SQL 注入 | Prisma 参数化查询 | 框架保障 |
| 数据校验 | Zod schema 校验所有输入 | 每个 Step 实现 |

## 性能设计

| 项目 | 方案 |
|------|------|
| 页面加载 | React Server Components (零客户端 JS) |
| 数据库查询 | Prisma + PostgreSQL 索引 |
| 排名计算 | 按需计算 (MVP 数据量小，不需要缓存) |
| 静态页面 | 赛事详情页可 ISR (增量静态生成) |

---

## 工程审查决策记录

> 审查日期: 2026-03-19 | 模式: BIG CHANGE | 结果: 16 issues, 0 critical gaps

| # | 决策 | 选项 | 结论 |
|---|------|------|------|
| 1 | 评委分配数据模型 | 联表/隐式推断/JSON字段 | 新增 EventJudge 联表 |
| 2 | 排名发布状态 | 复用 published / 独立字段 | Event 加 rankingsPublished 字段 |
| 3 | 赛事生命周期 | 显式 status / 时间窗口驱动 | 时间窗口驱动 + getEventPhase() 函数 |
| 4 | JSONB 校验 | 拆表 / Zod 校验 | Zod schema 校验 |
| 5 | Slug 冲突 | 手动输入 / 自动重试 | 自动生成 + 冲突重试 |
| 6 | 时间窗口校验 | 无校验 / Zod refine | Zod refine 校验顺序 |
| 7 | NextAuth role 集成 | — | 扩展 User + signIn/session callbacks |
| 8 | 路由保护 | 单层 / 双层 | middleware + Server Action 双层防护 |
| 9 | 错误处理 | throw / ActionResult | 统一 ActionResult<T> + safeAction |
| 10 | 状态机逻辑 | 内联 / 独立模块 | 抽取 lib/registration-status.ts |
| 11 | 评分计算 | 内联 / 独立模块 | 抽取 lib/scoring.ts |
| 12 | 自定义字段 | 自由格式 / 类型规范 | 4 种字段类型 + Zod 校验 |
| 13 | 新增测试项 | 忽略 / 补入 | 7 项补入各 Step |
| 14 | 测试节奏 | 集中 Step 7 / 随 Step 编写 | 随 Step 同步编写 |
| 15 | 排名查询 | 逐个查询 / 批量 include | Prisma include 一次查齐 |
| 16 | 批量操作 | 逐个更新 / 事务 | Prisma $transaction |

## NOT in scope — 设计维度 (Design Review 产出)

| 项目 | 理由 |
|------|------|
| 正式 DESIGN.md | 当前隐式设计系统已记录在 PLAN.md，MVP 阶段够用；后续可运行 `/design-consultation` |
| Toast/通知组件 | 决策：不引入，保持 Server Action + 页面刷新模式；后续如需可引入 sonner |
| WCAG AA 全面达标 | MVP 只覆盖必做无障碍清单（label、触摸目标、图标 aria-label），其余延期 |
| 暗色模式 | shadcn/ui 支持但 MVP 不启用，统一浅色 |
| 动效/过渡动画 | MVP 不做 motion design，保持即时渲染 |
| 后台表格移动端卡片切换组件 | 方案已定义（表格转卡片），具体组件实现随 Step 4-6 各页面落地 |

## NOT in scope (MVP 明确排除)

| 项目 | 理由 | 何时做 |
|------|------|--------|
| 多租户隔离 | MVP 先单租户，后续加 orgId 字段 | Phase 1.5 |
| Gavel 配对评审 | 手动评分够用，算法可后续移植 | Phase 1.5 |
| 组队系统 | 报名时填队名字符串即可 | Phase 1.5 |
| 文件上传 | 作品提交用链接 | Phase 1.5 |
| 邮件通知 | 管理员手动通知 | Phase 1.5 |
| 公众投票 | 锦上添花 | Phase 2 |
| i18n 多语言 | 直接中文硬编码 | Phase 2 |
| AI 辅助评审 | LLM 集成 | Phase 2 |
| 数据分析仪表盘 | 运营分析 | Phase 2 |
| 赛事模板 | 一键克隆赛制 | Phase 2 |
| 作品 Gallery | 赛后公开展示 | Phase 2 |

## JunctionApp 参考资产

| 资产 | 位置 | 复用方式 |
|------|------|---------|
| Gavel 评审算法 | `backend/modules/reviewing/gavel/maths.js` | Phase 1.5 直接移植数学核心 |
| 注册状态机 | `shared/constants/registration-statuses.js` | 简化为 5 态参考 |
| 表单字段定义 | `shared/constants/` | 参考字段结构设计 |
| updateAllowed 模式 | `common/plugins/updateAllowed.js` | Prisma middleware 实现类似保护 |
| 评审 REST API 设计 | `backend/modules/reviewing/gavel/routes.js` | 参考 API 端点设计 |

## 12 个月路线图

```
  Month 1:     MVP 上线 (当前计划 — 8 天)
  Month 2:     Phase 1.5 — 多租户 + Gavel 评审 + 文件上传 + 邮件通知
  Month 3-4:   Phase 2 — AI 评审辅助 + 数据分析 + 赛事模板
  Month 5-6:   Phase 2 — 作品 Gallery + 公众投票 + i18n
  Month 7-9:   Phase 3 — 性能优化 + 开放 API
  Month 10-12: Phase 3 — 支付集成 + 白标定制
```
