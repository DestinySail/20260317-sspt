# 已解决问题记录

> 记录在实际开发过程中遇到、已经定位根因、并已完成修复和验证的问题。
> 仅记录“已解决”问题，不记录尚未确认或尚未修复的猜测。

## 2026-03-20 — Google 登录出现 `Configuration` 错误

- 现象：点击“登录 -> 使用 Google 登录”后，页面跳到 `Server error`，Auth.js 返回 `error=Configuration`。
- 根因：服务端 Auth.js 在拉取 Google OIDC 配置时使用 Node/undici 的 `fetch`，当前环境下该请求没有自动走 `HTTP_PROXY` / `HTTPS_PROXY`，导致访问 Google 超时。
- 解决方案：新增 `src/lib/server-proxy.ts`，在 `src/auth.ts` 初始化阶段为服务端请求配置代理；同时显式加入 `undici` 依赖，确保运行时可以通过代理访问 Google。
- 验证：本地已验证 Auth.js 登录入口可正确生成并跳转到 Google 授权地址，不再返回 `Configuration` 错误。
- 涉及文件：`src/lib/server-proxy.ts`、`src/auth.ts`、`package.json`、`bun.lock`

## 2026-03-20 — Server Component 调用 `buttonVariants()` 导致构建失败

- 现象：`next build` 失败，报错 `Attempted to call buttonVariants() from the server but buttonVariants is on the client`。
- 根因：`buttonVariants` 定义在客户端组件文件 `src/components/ui/button.tsx` 中，但被多个 Server Component 页面直接调用。
- 解决方案：新增服务端可用的链接按钮样式工具 `src/lib/button-link.ts`，并将首页、后台赛事页、赛事详情页中的链接按钮切换到该工具生成的 className。
- 验证：修复后 `bun run build` 成功通过。
- 涉及文件：`src/lib/button-link.ts`、`src/app/page.tsx`、`src/app/admin/events/page.tsx`、`src/app/admin/events/new/page.tsx`、`src/app/events/[slug]/page.tsx`

## 2026-03-20 — 构建期数据库不可达导致首页预渲染失败

- 现象：`next build` 在预渲染 `/` 时失败，Prisma 查询抛出数据库连接错误，导致整个构建中断。
- 根因：前台公开赛事查询默认直接访问数据库；当构建阶段数据库暂时不可达时，公开页没有降级兜底逻辑。
- 解决方案：在 `src/lib/events/queries.ts` 中对公开查询和后台列表查询增加失败兜底，在 Prisma 不可用或查询异常时返回空数组 / `null`，让页面展示空状态而不是直接崩溃。
- 验证：在数据库不可达条件下，项目已可成功执行 `bun run build`。
- 涉及文件：`src/lib/events/queries.ts`

## 2026-03-20 — 登录页错误展示占位 GitHub OAuth 入口

- 现象：`/api/auth/signin` 页面会展示 GitHub 登录按钮，但点击后跳转到了带有 `client_id=replace-with-github-client-id` 的 GitHub 授权地址，属于无效配置暴露给真实用户。
- 根因：`src/lib/auth-providers.ts` 仅判断环境变量是否“有值”，没有过滤 `.env.sample` 风格的占位值，导致占位 GitHub 配置被当成真实 Provider 注册。
- 解决方案：在 `src/lib/auth-providers.ts` 中增加占位值识别逻辑，过滤 `YOUR_` / `replace-with-` 这类样例值；同时新增 `src/lib/auth-providers.test.ts` 作为回归测试，覆盖占位值与真实值混用场景。
- 验证：`bun run lint && bun run typecheck && bun run test && bun run build` 全部通过；浏览器实测 `/api/auth/signin` 页面已只展示真实可用的 Google 登录按钮，不再暴露占位 GitHub 按钮。
- 涉及文件：`src/lib/auth-providers.ts`、`src/lib/auth-providers.test.ts`

## 2026-03-20 — 赛事编辑页时间字段因服务端时区出现回填偏移

- 现象：进入 `/admin/events/[id]/edit` 编辑已有赛事时，`datetime-local` 字段使用服务端时区格式化，部署环境与管理员浏览器时区不一致时，页面会显示整体偏移后的时间；即使用户不改时间直接保存，也可能把赛事时间错误重写。
- 根因：服务端页面在渲染前就把数据库中的 `Date` 转成了 `datetime-local` 字符串，这一步依赖 Node 运行时所在机器的时区，而不是管理员浏览器的本地时区。
- 解决方案：将时间字段标准化逻辑挪到客户端表单初始化阶段；新增 `EventFormInitialValues` 与 `normalizeEventFormValues`，让编辑页直接传递原始日期值，由浏览器按本地时区生成 `datetime-local` 输入值。
- 验证：`bun run lint && bun run typecheck && bun run test` 全部通过；新增 `src/lib/events/schema.test.ts` 回归测试，覆盖 ISO/UTC 时间输入在运行时区内的标准化行为。
- 涉及文件：`src/components/events/event-form.tsx`、`src/app/admin/events/[id]/edit/page.tsx`、`src/lib/events/schema.ts`、`src/lib/events/schema.test.ts`

## 2026-03-21 — 管理员登录后在赛事详情页看不到报名入口

- 现象：管理员账号访问已开启报名的赛事详情页时，页面没有显示“立即报名”入口，导致管理员无法直接参与报名。
- 根因：赛事详情页的报名入口判断逻辑分散在页面条件分支中，登录态、是否已有报名、报名窗口开放与管理员身份混在一起，导致管理员用户被错误落到无入口分支。
- 解决方案：抽取 `src/lib/registrations/entry-state.ts` 统一管理报名入口状态，改为显式区分 `existing / can_register / login_required / auth_unavailable / closed` 分支，并重构赛事详情页按该状态渲染按钮与提示。
- 验证：新增 `src/lib/registrations/entry-state.test.ts` 覆盖管理员可报名场景；`bun run lint && bun run typecheck && bun run test` 通过；浏览器联调确认管理员已可见并进入报名页。
- 涉及文件：`src/lib/registrations/entry-state.ts`、`src/lib/registrations/entry-state.test.ts`、`src/app/events/[slug]/page.tsx`

## 2026-03-21 — 后台调整报名字段后，旧报名表单会静默串值

- 现象：用户打开报名页后，如果管理员在后台调整了自定义字段顺序或内容，旧页面继续提交时会按索引错位写入答案，表面提交成功但实际字段答案已串值。
- 根因：报名表单与服务端校验都按字段数组下标匹配答案，自定义字段缺少稳定身份标识，导致字段配置变更后无法识别“旧表单”。
- 解决方案：为赛事自定义字段引入稳定 `id`，报名表单改为提交 `{ fieldId, value }[]`，服务端校验按 `fieldId` 匹配并在字段缺失、重复或配置已变化时返回 stale form 错误；同时为旧数据提供确定性 ID 生成与去重逻辑。
- 验证：补充 `events schema` 与 `registrations schema` 单元测试；`bun run lint && bun run typecheck && bun run test` 通过；浏览器联调确认旧表单提交会提示“报名字段已更新，请刷新页面后重新填写”。
- 涉及文件：`src/lib/events/schema.ts`、`src/lib/events/schema.test.ts`、`src/components/events/event-form.tsx`、`src/components/registrations/registration-form.tsx`、`src/lib/registrations/schema.ts`、`src/lib/registrations/schema.test.ts`

## 2026-03-21 — 并发重复报名只返回通用失败，未给出明确冲突提示

- 现象：同一用户在两个旧标签页同时提交同一赛事报名时，第二次提交会因数据库唯一约束失败，但前端只能看到通用错误，无法判断是“已报名”还是系统异常。
- 根因：`createRegistration` 仅做提交前查询，没有捕获真正写入阶段抛出的 Prisma `P2002` 唯一约束异常，导致并发冲突漏转成业务错误。
- 解决方案：在 `src/app/my/registrations/actions.ts` 中捕获 Prisma `P2002`，并将其转换为明确的 `CONFLICT` 业务结果，统一返回“你已提交过该赛事报名，请前往“我的报名”查看状态。”。
- 验证：`bun run lint && bun run typecheck && bun run test` 通过；浏览器双标签页复测确认第二次提交会展示明确冲突提示而非通用失败。
- 涉及文件：`src/app/my/registrations/actions.ts`

## 2026-03-21 — 登录入口使用 `Link` 指向 Auth.js API 路由，导致开发环境持续报 `UnknownAction`

- 现象：未登录用户打开首页或赛事详情页时，页面表面可正常展示，但 Next 开发日志会持续出现 `[auth][error] UnknownAction: Only GET and POST requests are supported`，噪音很大，容易掩盖真实认证问题。
- 根因：前台首页和全局 Header 把登录入口写成了 `Link href="/api/auth/signin"`；Next 会把它当作页面链接处理并发起额外预取请求，而 Auth.js 的 API 路由不接受这类请求方式，因而不断报错。
- 解决方案：保留 `Link`，但在登录入口上显式设置 `prefetch={false}`，避免对 `/api/auth/signin` 做页面级预取，同时不破坏现有导航样式与 lint 规则。
- 验证：`bun run lint && bun run typecheck && bun run test` 通过；使用浏览器重新打开首页与受保护页面后，`.next/dev/logs/next-development.log` 不再新增 `UnknownAction` 记录，登录入口点击仍可正常跳转到 Google 登录页。
- 涉及文件：`src/app/page.tsx`、`src/components/app-header.tsx`

## 2026-03-23 — 评审汇总查询错误使用 `projectScores` 关系名导致 TypeScript 构建失败

- 现象：实现 Step 5 评审与排名功能后运行 `bun run typecheck`，编译报错 `projectScores does not exist in type ProjectSelect`，导致评审查询与排名汇总代码无法通过类型检查。
- 根因：Prisma schema 中 `Project` 模型上的关系字段名实际是 `scores`，但实现时按表名直觉写成了 `projectScores`，与生成出来的 Prisma Client 类型不一致。
- 解决方案：统一将评审相关 select 和映射逻辑改为使用 `scores` 关系字段，并在进入排名汇总 helper 前显式转换为内部 `scoreRecords` 结构，避免页面与 helper 直接耦合 Prisma 命名。
- 验证：修复后 `bun run typecheck` 与 `bun run test` 通过，后台评审页、评审中心与公开榜单相关代码均可正常编译。
- 涉及文件：`src/lib/reviews/queries.ts`、`src/lib/reviews/ranking.ts`、`src/app/admin/events/actions.ts`

## 2026-03-23 — 并列排名读取未回写 rank 值，导致第二个并列项目排名变成 0

- 现象：新增 `src/lib/reviews/ranking.test.ts` 后，测试发现两个同分作品排序时，第一个作品排名为 `1`，第二个并列作品却得到 `0`。
- 根因：排名生成逻辑在 `map` 中读取的是尚未回写真实 rank 的原始数组项，上一项仍保留默认值 `0`，并列场景下错误复用了这个默认值。
- 解决方案：改为基于已经生成结果的累积数组计算 rank；只有在已生成结果中的上一项与当前项总分、评分人数完全一致时，才复用上一项的真实排名。
- 验证：更新实现后 `src/lib/reviews/ranking.test.ts` 通过；全量执行 `bun run lint && bun run typecheck && bun run test` 均通过。
- 涉及文件：`src/lib/reviews/ranking.ts`、`src/lib/reviews/ranking.test.ts`

## 2026-03-23 — 已有评分后仍可修改评分维度，导致历史评分被榜单静默排除

- 现象：管理员在赛事已有 `ProjectScore` 后仍可直接修改 `scoringCriteria`；修改后旧评分会继续在评委页显示为“已保存”，但后台汇总和公开榜单会静默忽略这些历史评分。
- 根因：`src/app/admin/events/actions.ts` 的 `updateEvent` 会无条件覆盖赛事评分维度，而排名汇总只接受与当前评分配置完全一致的历史评分记录，导致编辑配置与汇总口径分叉。
- 解决方案：新增评分维度结构比较 helper，并在 `updateEvent` 中加入服务端冻结约束；一旦赛事已有任意评分且评分维度发生名称、最高分、权重或顺序变化，直接返回 `CONFLICT`，同时在赛事编辑页补充“已有评分后评分维度会被冻结”的提示文案。
- 验证：新增 `src/lib/events/schema.test.ts` 与 `src/app/admin/events/actions.test.ts` 回归用例，覆盖维度比较和 `updateEvent` 冲突分支；执行 `bun run lint && bun run typecheck && bun run test` 全部通过。
- 涉及文件：`src/app/admin/events/actions.ts`、`src/app/admin/events/actions.test.ts`、`src/lib/events/schema.ts`、`src/lib/events/schema.test.ts`、`src/app/admin/events/[id]/edit/page.tsx`、`acceptance/step-5-review-ranking-checklist.md`、`acceptance/step-5-review-ranking-manual-script.md`

## 2026-03-23 — 移除评委后历史评分仍继续影响后台与前台榜单

- 现象：管理员在后台移除某位评委后，该评委虽然不再出现在分配列表中，但其已提交的 `ProjectScore` 仍继续参与“已评分作品”统计和项目排名汇总，导致撤销评委资格并不会撤销评分影响。
- 根因：`src/app/admin/events/actions.ts` 的 `removeJudgeFromEvent` 原先只删除 `EventJudge` 分配记录，没有同步清理该评委在当前赛事下的评分记录；而榜单与统计读取的是 `ProjectScore` 数据。
- 解决方案：将移除评委改为事务操作，先删除该评委在当前赛事下的 `ProjectScore`，再删除 `EventJudge` 分配记录；同时在后台评委面板补充说明文案，并把验收清单与手工脚本补充到“移除后不再影响榜单”的验证点。
- 验证：新增 `src/app/admin/events/actions.test.ts` 覆盖移除评委时会同步删除赛事评分记录；执行 `bun run lint && bun run typecheck && bun run test` 全部通过。
- 涉及文件：`src/app/admin/events/actions.ts`、`src/app/admin/events/actions.test.ts`、`src/components/reviews/judge-assignment-panel.tsx`、`acceptance/step-5-review-ranking-checklist.md`、`acceptance/step-5-review-ranking-manual-script.md`

## 2026-04-27 — 历史验收赛事 `管理员流程回归赛 2026` 残留在开发库

- 现象：Step 2 验收期间留下的赛事 `管理员流程回归赛 2026`（slug `2026`，published=true）一直保留在 dev 库，PLAN.md 中作为非阻塞遗留项跟踪，会污染本地开发与后续 QA 数据。
- 根因：该赛事是为完成"已发布状态拦截删除"等回归校验创造的样本，验收完成后未清理，又因为 `published=true` 不能直接走前台删除按钮。
- 解决方案：编写一次性脚本通过 Prisma 查询确认关联数据为零（0 个报名/作品/评委/评分），再直接通过 Prisma `event.delete` 清理目标记录，并在执行前重新校验关联计数避免误删。
- 验证：脚本输出确认仅有 1 条目标赛事且关联计数全为 0，删除后再次查询返回"无"；脚本执行完即从仓库移除。
- 涉及文件：（一次性清理脚本，不入库）

## 2026-04-27 — 本地 E2E 受 `DATABASE_URL=neondb` 安全约束阻塞，无法实跑

- 现象：本地 `.env.local` 的 `DATABASE_URL` 指向 dev 库 `neondb`，`bun run e2e:reset` / `bun run test:e2e` 因 `assertSafeE2EDatabaseUrl` 拒绝执行；要本地实跑 Playwright 必须临时修改 `.env.local` 或绕过保护逻辑，风险高。
- 根因：E2E 工具只读 `DATABASE_URL`，开发库与测试库共用一条环境变量；`assertSafeE2EDatabaseUrl` 的"名称必须含 test/e2e"保护是必要的，但缺少独立测试库通道。
- 解决方案：引入 `E2E_DATABASE_URL` 覆盖机制——`e2e/helpers/env.ts` 新增 `getE2EDatabaseUrl()`，优先返回 `E2E_DATABASE_URL`，否则回退 `DATABASE_URL`；`e2e/helpers/db.ts` 在构造 `PrismaClient` 时显式传入 `datasources.db.url`；`playwright.config.ts` 在 `webServer.env` 中把 `E2E_DATABASE_URL` 注入为 `DATABASE_URL`，让 Next dev server 与 reset/seed 共享同一个测试库。安全断言保留，CI 行为不变（不设 `E2E_DATABASE_URL` 即可）。
- 验证：新增 `e2e/helpers/env.test.ts`（6 用例，覆盖优先级、回退、缺失抛错、test/e2e 名称放行、非测试库拒绝、CI 短路）；`bun run lint && bun run typecheck && bun run test` 通过（87 tests）；本地手动跑过 4 个关键用例 + CI 短路均符合预期；2026-04-27 在 Neon 测试 branch `neondb_e2e` + `E2E_DATABASE_URL` 注入机制下完成本地 Playwright 实跑 3/3 全通过。
- 涉及文件：`e2e/helpers/env.ts`、`e2e/helpers/env.test.ts`、`e2e/helpers/db.ts`、`playwright.config.ts`、`vitest.config.ts`、`.env.sample`、`acceptance/step-7-testing-checklist.md`、`acceptance/step-7-testing-manual-script.md`、`acceptance/step-7-e2e-local-setup.md`

## 2026-04-27 — 本地 Playwright dev server 因 ADMIN_EMAILS 未注入导致 admin 流程全部 403

- 现象：`E2E_DATABASE_URL` 隔离机制就绪后首次本地实跑 Playwright，3 条主流程全部失败：admin spec 找不到表单字段、registration spec 报名后未跳 my/registrations、review spec 找不到分配评委的输入框；表象都是 admin 路由被重定向。Playwright session 截图显示用户为"E2E Admin普通用户"——cookie 中的 ADMIN role 未生效。
- 根因：`src/auth.config.ts` 的 jwt callback 永远以 `getRoleForEmail(email)` 重写 role，只有当邮箱命中 `ADMIN_EMAILS` 才返回 ADMIN。本地 `.env.local` 的 `ADMIN_EMAILS=lidiyang1993@gmail.com` 不包含 E2E admin `admin-e2e@example.com`；Playwright 启动的 dev server 继承了 `.env.local`，导致 E2E admin 一直被识别为普通用户。
- 解决方案：扩展 `playwright.config.ts` 的 `webServer.env`：当检测到 `E2E_DATABASE_URL` 时，同步注入 `ADMIN_EMAILS=admin-e2e@example.com`（与 `.github/workflows/ci.yml` 里 CI 行为对齐），并支持通过 `E2E_ADMIN_EMAILS` 环境变量覆盖。同时把 Playwright 全局 `timeout` 调到本地 120s/CI 60s，`expect.timeout` 调到 10s——dev 模式 Turbopack 首次编译会让单条 spec 超过默认 30s。
- 验证：本地 reset 测试库 + 重启 dev server + Playwright 实跑，3/3 spec 通过（admin-publish 19s / registration-submission 26.7s / review-ranking 1.1m，总 1.9 分钟）。
- 涉及文件：`playwright.config.ts`

## 2026-04-27 — Admin 侧边栏"概览"和"赛事管理"在子路径下双高亮

- 现象：进入 `/admin/events`、`/admin/events/new`、`/admin/events/[id]/edit` 等任一子路径时，左侧导航栏中"概览"和"赛事管理"两个 tab 同时显示为激活状态（边框 + 文字均为 primary 色），无法判断当前位置。
- 根因：`src/components/admin-sidebar.tsx` 的 `isActive` 判断使用 `pathname === item.href || pathname.startsWith(\`${item.href}/\`)`，但 `概览` 的 href 是 `/admin`，对子路径 `/admin/events` 也满足 `startsWith("/admin/")`，导致根路径项错误命中所有 admin 子页面。
- 解决方案：抽出纯函数 `isAdminNavItemActive(pathname, href)`，对 `/admin` 改为严格 `pathname === "/admin"` 精确匹配，其他项保持 prefix 匹配；并加 `pathname.startsWith(\`${href}/\`)` 末尾的 `/` 防御 `/admin/eventsx` 这类前缀陷阱。
- 验证：新增 `src/components/admin-sidebar.test.ts`（4 用例：精确匹配 / 子路径 prefix / 前缀陷阱防御 / 非 admin 路径），4/4 通过；`bun run lint && bun run typecheck` 通过。
- 涉及文件：`src/components/admin-sidebar.tsx`、`src/components/admin-sidebar.test.ts`

## 2026-04-27 — gstack qa 探索式 QA 发现 10 个真实可优化项（不阻塞）

- 现象：在 Playwright 主流程通过后，借助 `agent-browser` 按 gstack qa 流程做了一轮探索式 QA，覆盖匿名首页、登录态后台、报名表单、错误页、移动端、控制台等场景。
- 结果：综合健康分 85/100，发现 10 个 issues（全部归档到 `.gstack/qa-reports/qa-report-localhost-2026-04-27.md`），其中 3 个 High（报名表单 stale validation、`window.confirm/alert` 替代为 AlertDialog、404/SignIn/Admin 首页占位文案）、3 个 Medium、4 个 Low；不阻塞核心流程使用。
- 验证：控制台干净，关键流程（创建赛事 → 发布 → 报名 → 录取 → 确认 → 提交 → 评审 → 排名）端到端可用。
- 涉及文件：`.gstack/qa-reports/qa-report-localhost-2026-04-27.md`、`.gstack/qa-reports/screenshots/*`

## 2026-05-14 — 生成落地页进度页代码区与思考区间隔过大，且代码流没有贴底显示

- 现象：后台生成赛事落地页时，“思考过程”区域和下面代码显示区之间出现大块空白；进入代码生成阶段后，代码内容没有自动保持在滚动容器底部；代码区上下两端都被透明渐隐处理，底部内容也会被淡化。
- 根因：`src/components/events/generating-page-content.tsx` 中思考过程容器使用 `flex-1` 占满剩余空间，导致代码区被推到页面下方；代码滚动容器没有在 `codeContent` 更新后同步设置 `scrollTop`；代码 mask 使用上下对称的 `linear-gradient(transparent 0%, black 15%, black 85%, transparent 100%)`。
- 解决方案：抽出 `generating-page-layout.ts` 保存布局契约；将思考过程容器改为 `flex-none`，让代码区紧跟其后；为代码滚动容器增加 ref，并在代码内容追加或状态完成时用 `requestAnimationFrame` 滚动到底；将代码 mask 改为仅顶部渐隐的 `linear-gradient(transparent 0%, black 8%, black 100%)`，并移除底部渐隐层。
- 验证结果：先新增/更新 `src/components/events/generating-page-content.test.tsx` 覆盖“只顶部渐隐”和“思考区不占满页面”的布局行为，确认红灯后实现修复；`bunx vitest run src/components/events/generating-page-content.test.tsx`、`bun run typecheck`、`bun run lint` 均通过。本地浏览器打开生成页时因未登录被 Auth 重定向到登录页，未完成真实登录态视觉截图。
- 涉及文件：`src/components/events/generating-page-content.tsx`、`src/components/events/generating-page-layout.ts`、`src/components/events/generating-page-content.test.tsx`

## 2026-05-14 — 生成落地页保存接口 500 且完成态缺少预览按钮

- 现象：生成完成后点击保存，请求 `POST /api/admin/events/[id]/save-landing` 返回 500；生成完成态只显示“丢弃 / 保存”，没有 PRD 要求的“预览”按钮。
- 根因：`schema.prisma` 已改为多版本 `EventLandingPage`，但迁移目录缺少创建/升级 `EventLandingPage` 表的 migration，当前开发库可能没有 `version` / `isActive` 等字段或表结构；保存接口响应也没有按 PRD 暴露顶层 `version` 和 `isActive`；完成态 UI 没有实现预览动作。
- 解决方案：新增版本化落地页迁移，兼容旧开发库中可能已存在的一页一赛事旧表，移除旧 `eventId` 唯一索引并创建 `(eventId, version)` 唯一索引；保存接口返回 `version`、`landingPage.isActive`；生成完成态增加“预览”按钮，用 Blob URL 在新标签页打开当前未保存 HTML。
- 验证结果：先新增保存接口测试和完成态动作测试并确认红灯，再实现修复；`bunx vitest run src/app/(app)/api/admin/events/[id]/save-landing/route.test.ts`、`bunx vitest run src/components/events/generating-page-content.test.tsx`、`bun run lint`、`bun run typecheck`、`bun run test` 均通过。`bun run db:migrate` 被既有 `20260510023345_add_performance_indexes` 中 `CREATE INDEX CONCURRENTLY` 的 shadow DB 事务限制挡住；已用 `bunx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260514154800_add_event_landing_page_versions/migration.sql` 将本次表结构应用到当前开发库，并查询确认 `version` / `isActive` 字段存在且与 schema 对齐。
- 涉及文件：`prisma/migrations/20260514154800_add_event_landing_page_versions/migration.sql`、`src/app/(app)/api/admin/events/[id]/save-landing/route.ts`、`src/app/(app)/api/admin/events/[id]/save-landing/route.test.ts`、`src/components/events/generating-page-content.tsx`、`src/components/events/generating-page-layout.ts`、`src/components/events/generating-page-content.test.tsx`

## 2026-05-14 — 赛事列表缺少“查看落地页”入口

- 现象：首页赛事列表和后台赛事列表没有显示 PRD 要求的“查看落地页”按钮，管理员或参赛者需要绕到详情或编辑页才可能找到落地页入口。
- 根因：`listAdminEvents()` / `listPublishedEvents()` 复用的 `eventDetailsSelect` 没有读取 `EventLandingPage` 的激活版本；页面虽然已有 `event.landingPage` 的使用场景，但列表查询返回的数据里始终没有当前激活落地页。
- 解决方案：在赛事查询层统一选择 `landingPages where isActive=true`，映射为页面使用的单个 `landingPage`；首页卡片增加“查看详情”和有激活版本时的“查看落地页”按钮；后台列表移动端与桌面操作区显示“查看落地页”或“未生成”。
- 验证结果：先新增 `src/lib/events/queries.test.ts` 复现查询未取激活落地页的红灯，再修复到绿灯；`bunx vitest run src/lib/events/queries.test.ts` 和 `bun run typecheck` 均通过。
- 涉及文件：`src/lib/events/queries.ts`、`src/lib/events/queries.test.ts`、`src/app/(app)/page.tsx`、`src/app/(app)/admin/events/page.tsx`

## 2026-05-15 — 多个已保存落地页没有激活入口，首页卡片没有直达激活落地页

- 现象：数据库中已保存多条 `EventLandingPage` 记录，但 `isActive` 全为 `false` 时，后台编辑页没有地方选择激活展示哪个版本；首页赛事列表也只能进入赛事详情或旧按钮入口，不能点击赛事卡片直达激活落地页。
- 根因：赛事编辑页只根据 `event.landingPage` 判断是否已有落地页，而该字段只映射当前激活版本；没有激活版本时即使数据库已有多个保存版本，UI 也会把它们当作不存在。首页卡片本身也没有根据激活版本切换主链接。
- 解决方案：编辑页改为读取该赛事全部落地页版本，新增 `EventLandingVersions` 区块展示 version、风格、生成时间和激活状态，并通过服务端表单调用 `activateLandingPage` 后刷新相关路径；首页赛事卡片改为有激活版本时整卡链接到 `/events/[slug]/landing`，否则保持进入赛事详情。
- 验证结果：先新增首页卡片链接测试和落地页版本列表组件测试确认红灯，再实现修复；`bunx vitest run "src/app/(app)/page.test.tsx" "src/components/events/event-landing-versions.test.tsx" src/lib/ai/queries.test.ts "src/app/(app)/api/admin/events/[id]/landing-pages/route.test.ts"`、`bun run lint`、`bun run typecheck` 均通过。
- 涉及文件：`src/app/(app)/admin/events/[id]/edit/page.tsx`、`src/app/(app)/page.tsx`、`src/components/events/event-landing-versions.tsx`、`src/app/(app)/page.test.tsx`、`src/components/events/event-landing-versions.test.tsx`、`acceptance/step-9-landing-page-activation-checklist.md`

## 2026-05-19 — 生成落地页左上角显示 ```html 字符串

- 现象：查看 AI 生成的赛事落地页时，页面左上角会出现 Markdown 代码块标记 ` ```html`，影响前台展示。
- 根因：`src/lib/ai/code-generator.ts` 在流式解析 AI 响应时把 ` ```html` 识别为代码阶段起点，但随后用 `textToCheck.slice(markerPos)` 把代码围栏本身也追加进 `fullHtml`；保存后的 `EventLandingPage.content` 因此包含非 HTML 文本，iframe `srcDoc` 会把它渲染到页面左上角。
- 解决方案：新增 `src/lib/ai/html-sanitize.ts`，将代码阶段起点拆成“边界位置”和“HTML 内容起点”，遇到 ` ```html` 时从围栏之后开始收集 HTML；发送 `done` 事件前统一剥离开头/结尾 Markdown 代码围栏。同时将 AI 生成提示词调整为遵循 Web Design Engineer 工作流，强调视觉方向、设计系统、自检和最终可保存内容不得包含代码围栏。
- 验证结果：新增回归断言覆盖 ` ```html` 起始围栏和结尾 ` ``` ` 剥离；`bunx vitest run src/lib/ai/code-generator.test.ts src/lib/ai/prompt-builder.test.ts` 通过（2 个测试文件，20 个用例）。
- 涉及文件：`src/lib/ai/html-sanitize.ts`、`src/lib/ai/code-generator.ts`、`src/lib/ai/prompt-builder.ts`、`src/lib/ai/code-generator.test.ts`、`src/lib/ai/prompt-builder.test.ts`、`acceptance/step-9-landing-page-activation-checklist.md`

## 2026-05-19 — 落地页生成过程代码区撑出页面滚动且显示发白、输出跳段

- 现象：后台生成赛事落地页时，代码块内容过长会让浏览器页面本身出现上下滚动条；代码区大面积透明发白导致内容看不清；代码展示按 SSE 网络 chunk 一段一段跳出，不够流畅。
- 根因：`GeneratingPageContent` 根容器使用 `h-[calc(100vh-64px)]`，但该页面实际嵌套在带 `py-8` 的 admin layout 内，生成页高度加外层 padding 会超过视口；代码区同时使用顶部渐变层和 mask，视觉上把整块内容洗浅；前端收到 `code` 事件后直接把完整 chunk 拼进 React state，展示节奏取决于网络包大小。
- 解决方案：抽取生成页布局常量，根容器改为 `h-[calc(100dvh-8rem)] min-h-0 overflow-hidden`，让代码区内部滚动；代码 panel 与滚动层改为不透明深色底，只保留顶部渐隐 mask；新增 `pendingCodeRef` / `displayedCodeRef` / `requestAnimationFrame` 打字机缓冲，让收到的代码按帧逐步展示。
- 验证结果：新增布局约束回归断言覆盖视口高度、内部滚动、不透明代码底和仅顶部渐隐；`bunx vitest run src/components/events/generating-page-content.test.tsx` 通过（26 个用例），`bun run typecheck`、`bun run lint` 通过。尝试用本地浏览器打开 `http://localhost:3000/admin/events` 时被当前未登录会话重定向到 Auth.js 登录页，因此未完成后台生成页截图验收。
- 涉及文件：`src/components/events/generating-page-content.tsx`、`src/components/events/generating-page-layout.ts`、`src/components/events/generating-page-content.test.tsx`、`acceptance/step-9-landing-page-activation-checklist.md`

## 2026-05-19 — 后台落地页版本列表查看任意版本都显示当前激活版本

- 现象：在管理后台赛事编辑页的落地页版本列表中，点击不同版本的“查看”，打开后看到的都是当前激活落地页，无法检查对应历史版本内容。
- 根因：`EventLandingVersions` 每行“查看”都链接到公开前台路由 `/events/[slug]/landing`；该路由按设计只读取 `isActive=true` 的当前激活版本，没有携带或使用具体 `EventLandingPage.id`。
- 解决方案：后台预览页 `/admin/events/[id]/landing-preview` 增加 `landingPageId` 查询参数支持；传入时用 `getEventLandingPageById()` 读取指定版本，并校验该版本的 `event.id` 与路由赛事 ID 一致；版本列表每行“查看”改为链接到 `/admin/events/[eventId]/landing-preview?landingPageId=[landingPageId]`。不带参数的顶部“查看落地页”仍保持预览当前激活版本。
- 验证结果：新增/更新组件与查询测试，覆盖每个版本生成独立预览链接以及按 ID 加载版本时包含所属赛事；`bunx vitest run src/components/events/event-landing-versions.test.tsx src/lib/ai/queries.test.ts` 通过（2 个测试文件，10 个用例），`bun run typecheck`、`bun run lint` 通过。
- 涉及文件：`src/components/events/event-landing-versions.tsx`、`src/components/events/event-landing-versions.test.tsx`、`src/app/(admin-landing)/admin/events/[id]/landing-preview/page.tsx`、`src/app/(app)/admin/events/[id]/edit/page.tsx`、`src/lib/ai/queries.ts`、`src/lib/ai/queries.test.ts`、`acceptance/step-9-landing-page-activation-checklist.md`
