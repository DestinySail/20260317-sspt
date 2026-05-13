# Fork 与源仓库代码对比记录

> 记录日期: 2026-05-10
> Fork 仓库: `DestinySail/20260317-sspt`
> 源仓库: `ldyoung-ldy/20260317-sspt`
> 当前本地分支: `main` (`08bac69 fix: optimize app navigation performance`)
> 对比基准: 源仓库默认分支 `codex/step7` (`9440041`)

## 结论摘要

当前 fork 的 `main` 相对源仓库默认分支是单向领先状态：

- 源仓库 `codex/step7` 没有 fork 未包含的提交。
- 当前 `main` 比源仓库 `codex/step7` 多 9 个提交。
- 当前 `main` 比源仓库 `main` 也多 9 个提交。
- 差异规模为 30 个文件，约 437 行新增、58 行删除。

因此本地 fork 不是落后源仓库，而是在源仓库基础上继续加入了登录体验、部署配置、调试接口、导航性能优化、数据库索引和截图文档更新。

## 分支关系

| 对比项 | 结果 |
| --- | --- |
| fork 默认分支 | `codex/step7` |
| 源仓库默认分支 | `codex/step7` |
| 本地当前分支 | `main` |
| `upstream/codex/step7...HEAD` | `0` behind / `9` ahead |
| `upstream/main...HEAD` | `0` behind / `9` ahead |

## 主要差异

### 1. 登录体验与 Auth 错误页

新增登录对话框和触发器，替代直接跳转 `/api/auth/signin` 的入口：

- `src/components/sign-in-dialog.tsx`
- `src/components/sign-in-trigger.tsx`
- `src/components/app-header.tsx`

同时新增 Auth.js 错误页，并在 `src/auth.config.ts` 中配置：

- `src/app/auth/error/page.tsx`
- `pages.error = "/auth/error"`

影响：用户登录失败时有项目内错误页承接；登录入口体验更统一。

### 2. 导航与预取优化

新增 `IntentLink`，并将部分导航改为按用户意图触发预取，同时阻止当前页面重复导航：

- `src/components/intent-link.tsx`
- `src/components/app-header.tsx`
- `src/components/mobile-nav.tsx`
- `src/components/admin-sidebar.tsx`

多个后台和个人中心页面也显式加了 `prefetch={false}`，降低列表页大量动态链接带来的无效预取：

- `src/app/admin/events/page.tsx`
- `src/app/admin/events/[id]/projects/page.tsx`
- `src/app/admin/events/[id]/registrations/page.tsx`
- `src/app/judge/page.tsx`
- `src/app/my/projects/page.tsx`
- `src/app/my/registrations/page.tsx`

影响：更贴合管理后台的高密度链接场景，减少导航预取噪声和重复请求。

### 3. 数据查询与渲染性能优化

关键查询与会话读取增加缓存或并行化：

- `src/lib/auth-session.ts` 使用 React `cache()` 包装 `getOptionalSession()`。
- `src/lib/reviews/queries.ts` 使用 React `cache()` 包装 `hasJudgeAssignments()`。
- `src/app/events/[slug]/page.tsx` 将排名、报名、作品查询改为 `Promise.all()` 并行获取。

数据库层新增索引：

- `Event`: `@@index([published, startDate, createdAt])`
- `Registration`: `@@index([userId, createdAt])`、`@@index([eventId, status, createdAt])`
- `Project`: `@@index([submittedBy, updatedAt, createdAt])`、`@@index([eventId, status, updatedAt, createdAt])`
- `ProjectScore`: `@@index([eventId, judgeId])`
- `EventJudge`: `@@index([userId])`

影响：公开赛事列表、个人报名/作品、后台状态筛选、评委入口判断等路径更容易命中索引。

### 4. 部署配置

为 Vercel 和 Prisma Client 生成补充配置：

- `package.json` 新增 `postinstall: prisma generate`
- `vercel.json` 指定 `framework: nextjs` 与 `outputDirectory: .next`
- `next.config.ts` 新增 `experimental.staleTimes`

影响：部署环境更容易正确生成 Prisma Client，并明确 Vercel 输出目录。

### 5. 调试接口

新增调试接口：

- `src/app/api/debug-env/route.ts`

接口会返回环境变量是否存在、数据库连通性、用户数量，以及失败时的数据库错误信息。

影响：便于部署排查，但生产上线前需要确认是否保留。若保留，建议增加管理员鉴权或仅在非生产环境启用，避免暴露数据库错误细节和用户计数。

### 6. 文档与截图

README 截图更新：

- 新增 `docs/screenshots/admin-events.png`
- 删除 `docs/screenshots/login.png`
- `README.md` 改为展示首页和管理后台赛事列表截图

影响：文档展示更接近当前产品主流程。

## 需关注事项

1. `src/app/api/debug-env/route.ts` 当前没有鉴权，生产部署前建议处理。
2. `next.config.ts` 使用 `experimental.staleTimes`，后续继续调整 Next.js 路由或缓存行为前，应按仓库约定先查 `node_modules/next/dist/docs/` 对应文档。
3. 当前对比只确认 Git 差异和代码结构，没有执行 lint、typecheck 或测试。
4. 本地 `main` 已包含源仓库 `main` 与 `codex/step7` 的内容；如果后续要和源仓库继续同步，可优先关注源仓库是否出现新的提交，而不是反向合并当前差异。

## 本次使用的对比命令

```bash
gh repo view DestinySail/20260317-sspt --json nameWithOwner,isFork,parent,defaultBranchRef,url
gh repo view ldyoung-ldy/20260317-sspt --json nameWithOwner,defaultBranchRef,url,pushedAt
git fetch https://github.com/ldyoung-ldy/20260317-sspt.git refs/heads/codex/step7:refs/remotes/upstream/codex/step7 refs/heads/main:refs/remotes/upstream/main
git rev-list --left-right --count upstream/codex/step7...HEAD
git rev-list --left-right --count upstream/main...HEAD
git diff --stat upstream/codex/step7...HEAD
git diff --name-status upstream/codex/step7...HEAD
git log --oneline --decorate upstream/codex/step7..HEAD
```
