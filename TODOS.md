# TODOS — AI 赛事管理平台 MVP (v2)

> 进度跟踪文件 | 创建: 2026-03-19 | 最后更新: 2026-05-13（Step 8 部署上线完成，87/87 全量完成） | 关联: [PLAN.md](./PLAN.md)
> 基于 CEO Review (SCOPE REDUCTION) 重写，从零搭建现代技术栈

## 🎯 全部完成

> Step 8 部署上线已完成，MVP 全量交付。

## 进度总览

```
  Step 1: 项目脚手架        [x] 12/12  ██████████  Day 1  ← 已完成
  Step 2: 赛事管理          [x] 20/20  ██████████  Day 2-3
  Step 3: 报名流程          [x] 13/13  ██████████  Day 3-4
  Step 3.5: 组件抽取        [x] 8/8    ██████████  Day 4 前置
  Step 4: 作品提交          [x] 7/7    ██████████  Day 4-5
  UI: 设计刷新              [x] 1/1    ██████████  Day 4-5 后
  Step 5: 评分系统          [x] 8/8    ██████████  Day 5-6
  Step 6: 排名系统          [x] 6/6    ██████████  Day 6-7
  Step 7: 测试              [x] 7/7    ██████████  Day 7-8
  Step 8: 部署上线          [x] 5/5    ██████████  Day 8
  ─────────────────────────────────────────────────
  TOTAL                     [x] 87/87  ██████████
```

---

## Step 1: 项目脚手架 — Day 1

> 优先级: P0 | 预估: 1 天 | 状态: ✅ 已完成

- [x] 1.1 创建 Next.js 16 项目 (`create-next-app` + App Router + TypeScript)
- [x] 1.2 安装并配置 Tailwind CSS + shadcn/ui (基础组件已补齐: Button, Input, Card, Table, Dialog, Label, Select, Textarea, Badge, DropdownMenu, Separator, Sheet, Avatar, Tabs)
- [x] 1.3 安装并配置 Prisma + 连接 Neon PostgreSQL
- [x] 1.4 定义 Prisma Schema (User, Account, Session, VerificationToken, Event, Registration, Project, ProjectScore, EventJudge)
- [x] 1.5 生成首个 migration SQL，并将初始表结构应用到 Neon 开发库
- [x] 1.6 安装并配置 NextAuth.js v5 (GitHub + Google provider)
- [x] 1.7 实现 Admin 角色自动匹配逻辑 (NextAuth callbacks 中检查 ADMIN_EMAILS)
- [x] 1.8 基础布局组件 (Header 含用户入口 + 管理后台 Sidebar + Admin Shell)
- [x] 1.9 配置 Vitest 测试框架并补充 `access-control` / `action-result` 单测
- [x] 1.10 实现 `proxy.ts` 路由保护 (/admin/* 需 admin 角色，未登录重定向)
- [x] 1.11 定义 Server Action 统一返回类型 `ActionResult<T>` + `safeAction` wrapper
- [x] 1.12 验证: `bun run dev/build/lint/typecheck/test` 通过，`/api/auth/providers` 返回 GitHub/Google

### Step 1 收尾备注

- 当前代码基于 `Next.js 16.2.0`，原计划中的 `middleware.ts` 已按官方约定替换为 `proxy.ts`
- 由于 Prisma CLI 对当前 Neon 连接方式写库时报 `P1001`，已使用仓库内初始 `migration.sql` 直接创建开发库表结构；schema 校验、运行时连库和表结构均已验证通过
- Google / GitHub provider 已在本地接口返回，后台未登录保护已验证；并已通过导入 `localhost` 管理员登录态完成一次真实后台访问与管理员操作闭环验证

### 完成标准
- 本地开发服务器正常启动
- OAuth provider 已正确加载，登录链路可继续浏览器联调
- ADMIN_EMAILS 中的用户登录后自动获得 admin 角色
- 数据库表已创建，Prisma Studio 可查看


---

## Step 2: 赛事管理 — Day 2-3

> 优先级: P0 | 预估: 1.5 天 | 状态: ✅ 已完成（非阻塞收尾延期到 Step 3 完成后处理）

- [x] 2.1 Server Actions: `createEvent`、`updateEvent`、`togglePublish`
- [x] 2.2 管理后台: 赛事列表页 (表格 + 状态展示 + 创建入口)
- [x] 2.3 管理后台: 创建赛事表单 (基础信息 + 时间配置 + 赛道/赛题/奖项/评分维度/自定义字段)
- [x] 2.4 管理后台: 发布/取消发布赛事 (toggle 已实现)
- [x] 2.5 前台: 首页赛事列表 (仅已发布赛事，卡片展示)
- [x] 2.6 前台: 赛事详情页 (描述 + 时间线 + 赛道 + 奖项 + 报名状态)
- [x] 2.7 Slug 自动生成 (从赛事名称生成 URL-safe slug，唯一)
- [x] 2.8 时间窗口顺序校验 (Zod refine: 6 个时间字段严格递增)
- [x] 2.9 `getEventPhase(event)` 纯计算函数 (从时间窗口推断赛事阶段)
- [x] 2.10 Slug 生成 + 唯一冲突自动重试
- [x] 2.11 Happy path 验证: 管理员创建赛事 → 发布 → 前台可见 → 点击查看详情
- [x] 2.12 管理后台编辑页 (`/admin/events/[id]/edit`) 已实现，并支持名称/描述/时间/配置回填与保存
- [x] 2.13 删除策略已实现：仅未发布且无报名/作品/评分/评委分配数据的草稿赛事可删除
- [x] 2.14 编辑页时间回填时区问题已修复（客户端本地标准化 `datetime-local`）
- [x] 2.15 `/review` 收尾：已完成 pre-landing diff review，并修复时区回填 P1 问题
- [x] 2.16 authenticated admin `/qa` 主链路：create → publish → home visible → detail visible → edit sync → unpublish → home hidden
- [x] 2.17 负向表单 `/qa`：非法时间、重复评分维度、`select` 空选项已验证
- [x] 2.18 slug / 边界 `/qa`：空白名称、英文名称、中文改名、旧 slug 失效、纯符号 fallback、空配置详情页均已验证
- [x] 2.19 acceptance 回写：`acceptance/step-2-events-checklist.md` 与 `acceptance/step-2-events-manual-script.md` 已同步三轮 QA 结果
- [x] 2.20 delete 策略最终取证：已补齐“存在关联数据时删除被阻止”的真实验证

### Step 2 当前进度说明

- 赛事管理主功能已完成：后台创建 / 编辑 / 发布 / 取消发布 / 草稿删除、前台列表 / 详情联动均已落地
- pre-landing `/review` 已完成，并修复编辑页时区回填问题；对应回归测试已补齐
- authenticated admin `/qa` 已覆盖主链路、编辑同步、非法校验、slug 边界与空配置展示；acceptance 记录已同步回写
- 当前 slug 策略已确认接受：空白名称拦截、纯符号名称 fallback 到 `/event`、中文 / 纯数字名称保持现状
- “已有关联数据时删除被阻止”的真实验证已补齐，Step 2 功能与验收层面已闭环
- 当前剩余仅为历史验收数据去留等非阻塞收尾，已明确延期到 Step 3 完成后处理

### Step 2 非阻塞遗留 / 延期项

- **验收数据残留**：数据库中仍保留已发布的验收赛事 `管理员流程回归赛 2026`，需决定是否保留
- **延期处理说明**：以上收尾不影响当前系统使用，统一延期到 Step 3 开发完成后处理

### Step 2 完成标准

- 管理员能完整创建/编辑/发布赛事
- 前台只展示已发布赛事
- 赛事详情页信息完整展示
- 草稿删除策略已完成真实 QA 验证

### 延期到 Step 3 完成后处理

- 决定历史验收赛事 `管理员流程回归赛 2026` 是否保留或清理

---

## Step 3: 报名流程 — Day 3-4

> 优先级: P0 | 预估: 1.5 天 | 状态: ✅ 已完成

- [x] 3.1 Server Actions: `createRegistration`、`updateRegistrationStatus` (批量)、`confirmRegistration`、`cancelRegistration`
- [x] 3.2 状态转换校验逻辑 (确保合法路径: pending→accepted→confirmed, pending→rejected, accepted/confirmed→cancelled)
- [x] 3.3 前台: 报名表单页 (自定义字段渲染 + 队伍名填写 + 提交)
- [x] 3.4 前台: 我的报名页 (状态展示 + 确认/取消操作)
- [x] 3.5 管理后台: 报名管理页 (列表 + 筛选 + 批量接受/拒绝 + CSV 导出)
- [x] 3.6 时间窗口校验: `registrationStart ≤ now ≤ registrationEnd`
- [x] 3.7 抽取 `lib/registration-status.ts` 纯函数模块
- [x] 3.8 报名入口集成完成：赛事详情页、头部“我的报名”、后台赛事入口均已联动
- [x] 3.9 pre-landing review / diff review：已定位并修复字段索引匹配和重复报名错误提示两个缺陷
- [x] 3.10 authenticated admin flow QA：已验证管理员能看到报名入口、进入报名页并在“我的报名”看到结果
- [x] 3.11 非法表单校验场景：stale 字段提交、必填校验、URL 校验、select 选项校验已覆盖
- [x] 3.12 重复 / 冲突场景回归：双标签页重复报名已返回明确冲突提示
- [x] 3.13 acceptance 结果回写与收尾：验收清单已归档至 `acceptance/step-3-registration-checklist.md`

### Step 3 当前进度说明

- 报名流程主功能已落地：用户报名、管理员审核、用户确认/取消、后台批量审核与 CSV 导出均已完成
- 审查阶段已发现并修复两个真实缺陷：自定义字段按索引匹配导致旧表单串值，以及并发重复报名落为通用错误
- 浏览器联调已覆盖管理员报名入口、stale 提交拦截、重复报名冲突提示等关键回归
- 当前主要剩余工作不是功能编码，而是 acceptance 归档、历史验收样本清理与环境波动带来的 QA 收尾

### Step 3 当前阻塞 / 风险

- **Neon 间歇性连通抖动**：live QA 期间 Prisma 查询偶发失败，需要重试，影响联调稳定性
- **历史样本时间窗口不一致**：当前验收赛事里存在 `registrationStart < startDate` 的样本，后台编辑页在扰动型 QA 时容易被现有校验拦截
- **acceptance 尚未沉淀**：Step 3 的最终手工验收结果还未回写到 `acceptance/`，后续会话继承成本偏高

### Step 3 完成标准

- 报名状态转换严格按状态机执行
- 非报名时间窗口内无法提交报名
- 管理员能批量审核 + 导出数据
- review / qa / acceptance 结论已归档

### 旧计划校正（与实际代码 / 验收状态对齐）

- “Step 3 未开始” 已过期：当前报名流程核心代码和页面已完成
- “后台报名管理页 / CSV 导出未实现” 已过期：两者均已落地
- “review 与 QA 尚未展开” 已过期：当前已完成 diff review、关键 bug 修复与核心浏览器回归
- 当前真正未完成的事项是 acceptance 结果回写与样本数据收尾，而非功能开发本身

---

## Step 4: 作品提交 — Day 4-5

> 优先级: P0 | 预估: 1.5 天 | 状态: ✅ 已完成

- [x] 4.1 Server Actions: createProject, updateProject, submitProject (draft→final)
- [x] 4.2 权限校验: 只有 confirmed 状态的用户才能提交
- [x] 4.3 时间窗口校验: submissionStart ≤ now < submissionEnd
- [x] 4.4 前台: 作品提交页 (名称 + 描述 + 链接 + 赛道选择 + 保存草稿/提交终稿)
- [x] 4.5 前台: 我的作品页 (查看 + 截止前可编辑)
- [x] 4.6 管理后台: 作品管理页 (列表 + 筛选 + 详情查看 + CSV 导出)
- [x] 4.7 验证: confirmed 用户提交作品 → 管理员查看与导出（主链路 live QA 已完成）

### 完成标准
- 只有 confirmed 用户能在时间窗口内提交
- 草稿可编辑，终稿在截止前可修改
- 管理员能查看和导出所有作品

### Step 4 当前进度说明

- 作品提交主功能已落地：前台提交页、我的作品页、后台作品管理页、CSV 导出与赛事详情页入口联动均已实现
- 当前策略已锁定：终稿提交后在截止前仍可继续编辑并再次提交；保存草稿会把当前内容保存为 `DRAFT`
- Header 已增加“我的作品”导航，后台赛事列表也新增“作品管理”入口
- 自动化校验已通过：`bun run lint`、`bun run typecheck`、`bun run test`
- 真实数据库 + 浏览器登录态下的主链路 live QA 已完成，QA 报告与验收清单已同步回写
- 后续如继续补充回归，优先补一个”非 confirmed 用户阻断”和”提交窗口已结束”的 spot check

---

## UI: 设计刷新 — Day 4-5 后

> 优先级: P1 | 状态: ✅ 已完成

### 完成内容

- [x] 整体风格从 Industrial/Utilitarian 切换到 Warm Minimal（暖调极简）
- [x] 全局色系切换：主色从工具蓝 #0F6FDE 改为铜橘 #D97757，背景从白改为暖米 #FAF8F5
- [x] 字体更新：UI 标签字体从 DM Sans 改为 IBM Plex Mono（等宽技术感）
- [x] 圆角统一：移除 rounded-xl/rounded-2xl，统一使用 4px rounded-sm
- [x] 阴影移除：所有 shadow-sm 移除，改用 1px border 分割
- [x] 网格布局：使用 1px gap + border 色做网格分割线
- [x] 全局 grain 噪点纹理：SVG fractalNoise 叠加 3% opacity
- [x] ARIA landmarks 规范：header/main/nav/aside 添加语义化 labels
- [x] 骨架屏 loading 组件：新增 `loading.tsx` + `Skeleton` 组件
- [x] 首页重新设计：Hero section + 列表布局改为信息密度更高的设计

### 相关文件

- `DESIGN.md` — 设计规范文档已同步更新
- `AGENTS.md` — 圆角设计约定行已更新
- `src/app/globals.css` — 全局 CSS 变量更新
- `src/app/layout.tsx` — IBM Plex Mono 字体接入
- `src/components/ui/skeleton.tsx` — 新增骨架屏组件
- `src/app/loading.tsx` — 新增根级 loading
- `src/app/admin/loading.tsx` — 新增 admin loading
- `src/app/admin/events/loading.tsx` — 新增 admin events loading
- `src/app/events/[slug]/loading.tsx` — 新增 event detail loading

### 验证

- `/qa` 浏览器验证通过：首页、赛事详情、报名页、admin 重定向均正常
- 无 console errors

---

## Step 5: 评分系统 — Day 5-6

> 优先级: P0 | 预估: 1.5 天 | 状态: ✅ 已完成

- [x] 5.1 Server Actions: assignJudge / removeJudge / upsertProjectScore / getScoreSummary 已落地
- [x] 5.2 管理后台: 评分管理页 (评委列表 + 分配评委 + 评分进度总览)
- [x] 5.3 评委视图: 待评作品列表 + 评分表单 (按赛事配置的 scoringCriteria 渲染各维度打分)
- [x] 5.4 唯一约束校验: (projectId, judgeId) — 每个评委对每个作品只评一次
- [x] 5.5 评分时间窗口校验: reviewStart ≤ now ≤ reviewEnd
- [x] 5.6 评分 schema / 查询 / 排名 helper 已拆到 `src/lib/reviews/*`
- [x] 5.7 评分维度匹配校验与“已有评分后冻结维度”保护已完成
- [x] 5.8 验证: 管理员分配评委 → 评委逐一评分 → 管理员查看评分进度和详情（认证态 QA 已补跑）

### 完成标准
- 评委能按维度打分 + 填写评语
- 不能重复评分同一作品
- 管理员能看到评分进度

### Step 5 当前进度说明

- 评审主链路已经落地：管理员可在后台赛事评审页分配评委、查看评分覆盖率和榜单；评委可在 `/judge` 与 `/judge/events/[id]` 进入评审并反复保存评分。
- 评分数据层已补齐 schema、查询、排名 helper 和回归测试；自动化校验 `bun run lint && bun run typecheck && bun run test` 已通过。
- review 收尾问题已修复两项：已有评分后冻结评分维度；移除评委时同步撤销其历史评分影响。
- 认证态 `/qa` 已跑通“提交终稿 -> 分配评委 -> 保存评分 -> 后台看到榜单”的完整浏览器闭环。

---

## Step 6: 排名系统 — Day 6-7

> 优先级: P0 | 预估: 1 天 | 状态: ✅ 已完成

- [x] 6.1 排名计算逻辑: 各评委评分加权平均 → 按维度 weight 加权 → 排名
- [x] 6.2 管理后台: 排名管理页 (完整排名 + 各维度分数 + 发布/取消)
- [x] 6.3 前台: 赛事详情页内榜单公示区块 (仅管理员发布后可见)
- [x] 6.4 排名边界处理: 同分处理、无评分作品处理、评分不完整过滤
- [x] 6.5 无评分作品处理: 不参与排名；后台仅统计有效评分作品
- [x] 6.6 验证: 评分完成 → 管理员查看排名 → 发布 → 前台可见（认证态 QA 已补跑）

### 完成标准
- 排名计算正确 (加权平均)
- 同分并列处理正确
- 管理员发布前前台不可见

### Step 6 当前进度说明

- 排名汇总已在后台评审页和前台赛事详情页联动完成，管理员通过 `rankingsPublished` 开关控制公示。
- 排名 helper 已覆盖加权平均、同分并列、维度一致性过滤和稳定排序；并列 rank 缺陷已在实现阶段修复。
- 认证态 `/qa` 已确认：后台开启公示后前台出现榜单，关闭后榜单消失。
- 当前剩余不是功能实现，而是测试层面的补充 spot check，例如多评委同赛事和非评审窗口阻断。

---

## Step 7: 测试 — Day 7-8

> 优先级: P0 | 预估: 1 天 | 状态: ✅ 已完成

- [x] 7.1 补齐各 Step 遗漏的单元/集成测试（`src/app/judge/actions.test.ts`、`src/app/admin/events/actions.test.ts` 扩展）
- [x] 7.2 安装配置 Playwright（`@playwright/test`、`playwright.config.ts`）
- [x] 7.3 E2E 测试: 管理员创建赛事 → 发布 → 前台可见（`e2e/specs/admin-publish.spec.ts`）
- [x] 7.4 E2E 测试: 用户报名 → 管理员接受 → 用户确认 → 提交作品（`e2e/specs/registration-submission.spec.ts`）
- [x] 7.5 E2E 测试: 评委评分 → 排名计算 → 管理员发布 → 前台可见（`e2e/specs/review-ranking.spec.ts`，含非评审窗口阻断 + 多评委榜单 spot check）
- [x] 7.6 CI 配置 (GitHub Actions): push 时自动运行 lint + typecheck + Vitest + Playwright
- [x] 7.7 验证: CI Run 23422018389 全量绿灯（lint ✓ typecheck ✓ Vitest 81 tests ✓ Playwright 3 specs ✓）

### Step 7 当前进度说明

- Vitest 测试从 71 tests 增至 81 tests，新增 `src/app/judge/actions.test.ts` 覆盖未登录/未分配评委/非终稿/非评审窗口/stale 维度/upsert 路径；扩展 `src/app/admin/events/actions.test.ts` 覆盖未知邮箱/重复分配/无有效评分不可公开排名
- Playwright E2E 工具层包含 Auth.js cookie 注入（`e2e/helpers/auth.ts`）、隔离数据库 reset/seed（`e2e/scripts/reset-and-seed.ts`）、phase-shift（`e2e/helpers/scenarios.ts`）、UI helper（`e2e/helpers/ui.ts`）
- E2E 测试数据库保护：非 CI 环境下拒绝连接非 `test`/`e2e` 名称的数据库
- 3 条 E2E 主流程 spec 已覆盖非评审窗口阻断（第 25-29 行）和多评委榜单 spot check（第 43-62 行）
- Step 5 遗留的两个边界验证项已通过 E2E 自动化关闭

### 完成标准
- [x] 单元测试已在 Step 2-6 完成
- [x] E2E 测试覆盖完整赛事流程 (3 条主流程)
- [x] CI 绿灯

---

## Step 8: 部署上线 — Day 8

> 优先级: P0 | 预估: 0.5 天 | 状态: ✅ 已完成

- [x] 8.1 Neon 创建生产数据库 + 运行 migration
- [x] 8.2 Vercel 项目创建 + 环境变量配置 (DATABASE_URL, NEXTAUTH_*, OAuth, ADMIN_EMAILS)
- [x] 8.3 `git push` 部署 + 域名配置 (可选)
- [x] 8.4 冒烟测试: 创建赛事→报名→审核→提交→评分→排名 全流程
- [x] 8.5 验证: 生产 URL 可访问，核心流程走通

### 完成标准
- [x] 生产环境可公开访问
- [x] 完整赛事流程走通
- [x] 无 500 错误

### 部署信息
- 生产地址: https://sspt-ai.vercel.app/
- 部署日期: 2026-05-13

---

## Deferred TODOs (CEO Review 产出)

> 以下为 CEO Review 中识别的后续改进项，当前不实施

### DT-1: 多租户隔离
- **What:** 所有数据表加 organizationId 字段，加全局中间件做租户隔离
- **Why:** 当多个组织需要使用平台时必须隔离数据
- **Pros:** 支持 SaaS 模式，多客户共用一个部署
- **Cons:** 所有查询需加 organizationId 条件，需完整测试覆盖
- **Context:** MVP 单租户，Prisma 后续加字段 + migrate 即可。参考 JunctionApp 的 Organization 模型设计
- **Effort:** M (3-5 天)
- **Priority:** P1 — Phase 1.5 第一批
- **Depends on:** MVP 上线后

### DT-2: Gavel 配对评审
- **What:** 移植 JunctionApp 的 Gavel 贝叶斯配对投票算法
- **Why:** 大量作品时手动评分效率低，Gavel 能自动优化评审分配
- **Pros:** 评审效率大幅提升，结果更客观
- **Cons:** 算法复杂度高，需额外 3 张表 (GavelProject/Annotator/Decision)
- **Context:** 数学核心在 JunctionApp `backend/modules/reviewing/gavel/maths.js`，约 200 行纯函数可直接移植
- **Effort:** L (5-7 天)
- **Priority:** P1 — Phase 1.5
- **Depends on:** MVP 评分系统完成后

### DT-3: 文件上传
- **What:** 作品支持上传图片/文件，而非仅链接
- **Why:** 部分参赛者的作品不在线上，需要上传截图/文档
- **Pros:** 提交体验更完整
- **Cons:** 需引入对象存储 (S3/Cloudinary)，增加成本和复杂度
- **Context:** 可用 Vercel Blob 或 Cloudinary 免费额度
- **Effort:** S (1-2 天)
- **Priority:** P2 — Phase 1.5
- **Depends on:** MVP 作品提交完成后

### DT-4: 邮件通知
- **What:** 报名状态变更、评审分配等关键节点自动发送邮件
- **Why:** 管理员手动通知效率低且容易遗漏
- **Pros:** 自动化通知，减少运营工作量
- **Cons:** 需引入邮件服务 (Resend/SendGrid)，需处理送达率
- **Context:** 可用 Resend 免费额度 (100 封/天)
- **Effort:** S (1-2 天)
- **Priority:** P2 — Phase 1.5
- **Depends on:** MVP 上线后

### DT-5: 组队系统
- **What:** 正式的组队功能：创建队伍、邀请码加入、队伍管理
- **Why:** MVP 的 "填队名字符串" 无法保证同队成员关联
- **Pros:** 队伍成员之间可共享作品提交权限
- **Cons:** 新增 Team 表 + 邀请流程，增加复杂度
- **Context:** 参考 JunctionApp 的 Team 模型和邀请码机制
- **Effort:** M (2-3 天)
- **Priority:** P2 — Phase 1.5
- **Depends on:** MVP 上线后

---

## Phase 2 待办 (MVP 后)

- [ ] P2-1 AI 辅助评审 — LLM 自动初筛/打标/生成评语
- [ ] P2-2 数据分析仪表盘 — 报名漏斗/提交率/评审进度
- [ ] P2-3 赛事模板 — 一键克隆成熟赛制
- [ ] P2-4 作品 Gallery — 赛后公开展示
- [ ] P2-5 公众投票 — 观众投票环节
- [ ] P2-6 i18n 多语言 — next-intl 中英文切换

## Phase 3 待办

- [ ] P3-1 支付集成 — 报名费/赞助
- [ ] P3-2 开放 API — 赛事嵌入第三方官网
- [ ] P3-3 白标定制 — 品牌色/Logo/域名
