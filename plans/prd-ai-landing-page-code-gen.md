# PRD: AI 赛事落地页代码生成系统

## Problem Statement

当前 AI 生成赛事落地页的流程是：AI 输出 JSON 结构化数据 → 3 个固定模板（minimal/tech/vibrant）渲染。这导致：
1. 生成的页面千篇一律，缺乏创意和独特性
2. 管理员无法看到 AI 的生成过程，只有一个模拟进度条
3. 模板系统限制了设计的可能性，无法发挥 AI 的创造力

管理员希望 AI 能直接生成完整的 HTML/CSS/JS 代码，每次生成都是独特的设计，并且能实时看到代码的生成过程。

## Solution

用 AI 直接生成完整 HTML/CSS/JS 代码替代 JSON+模板系统。生成过程通过 SSE 流式传输，管理员在双栏界面（左代码流 + 右 iframe 预览）实时观察代码生成和页面效果。AI 的设计指南来自项目内 `skills/frontend-design/SKILL.md`，注入 system prompt，AI 有完全的创意自由。

## User Stories

1. As a 管理员, I want 在赛事编辑页点击"生成赛事页"时选择风格提示词（而非固定模板），so that AI 能根据提示词自由发挥设计
2. As a 管理员, I want 在生成过程中实时看到 AI 写出的每一行代码，so that 我能了解 AI 的设计思路
3. As a 管理员, I want 在代码生成的同时看到页面的实时预览效果，so that 我能立即判断生成结果是否满意
4. As a 管理员, I want 生成完成后查看/预览完整的落地页，so that 我能确认最终效果
5. As a 管理员, I want 生成完成后选择保存或丢弃，so that 我能控制哪些页面上线
6. As a 管理员, I want 对已有落地页的赛事重新生成，so that 我能迭代改进设计
7. As a 管理员, I want 生成失败时看到清晰的错误信息，so that 我能判断是重试还是联系技术支持
8. As a 管理员, I want 在生成过程中看到连接状态（connecting/streaming/completed/error），so that 我知道当前发生了什么
9. As a 参赛者, I want 访问赛事落地页时看到完整的赛事信息和视觉设计，so that 我能被赛事吸引并决定是否报名
10. As a 参赛者, I want 落地页在移动端也能正常显示，so that 我可以在手机上浏览赛事
11. As a 参赛者, I want 落地页加载速度快，so that 我不需要等待很长时间
12. As a 管理员, I want 风格提示词有预设选项（如"简约""科技感""活力"），so that 我不需要自己想提示词
13. As a 管理员, I want 也能输入自定义风格描述，so that 我能对设计方向有更精确的控制
14. As a 管理员, I want 生成的落地页中的报名按钮能正确跳转到报名页，so that 用户流程不断裂
15. As a 管理员, I want 代码展示面板有语法高亮和行号，so that 代码更易读
16. As a 管理员, I want 代码面板自动滚动到最新生成的代码，so that 我不需要手动滚动
17. As a 管理员, I want 生成完成后能一键查看落地页（新标签页打开），so that 我能快速验收
18. As a 管理员, I want 在赛事管理列表看到哪些赛事已有落地页，so that 我能管理生成状态
19. As a 参赛者, I want 落地页是安全的（无 XSS 风险），so that 我的浏览体验是安全的
20. As a 开发者, I want AI 生成的代码存储在数据库中（而非文件系统），so that 部署和管理更简单

## Implementation Decisions

### 架构决策

1. **AI 输出格式**：从输出 JSON 改为输出完整 HTML 字符串。AI 生成自包含的 `<!DOCTYPE html>` 文档，所有 CSS 写在 `<style>` 标签内，JS 写在 `<script>` 内，字体通过 `<link>` 引入 CDN 资源。

2. **渲染方式**：使用 `<iframe srcDoc={html}>` 沙箱渲染，隔离 XSS 风险。落地页与主应用完全解耦。

3. **流式传输**：API 端点改为 SSE（Server-Sent Events），AI 的每个 chunk 实时推送到前端。前端通过 `EventSource` 或 `fetch` + `ReadableStream` 消费。

4. **设计约束**：AI 自由发挥，遵循 `skills/frontend-design/SKILL.md` 的设计哲学，不强制 DESIGN.md。风格提示词作为参考而非硬约束。

5. **模板系统替换**：删除 `templates.ts` 的 3 个固定模板，替换为风格提示词常量（如"简约""科技感""活力""复古未来""奢华精致"等）。

6. **SKILL.md 注入**：读取 `skills/frontend-design/SKILL.md` 文件内容，注入到 AI 的 system prompt 中。每次生成时动态读取，确保使用最新版本。

7. **EventLandingPage 存储**：`content` 字段从存储 JSON 改为存储 HTML 字符串（`String` 类型而非 `Json` 类型）。需要 Prisma schema 迁移。

8. **Token 限制**：`max_tokens` 设置为 16000，确保完整页面能生成完。不设硬上限，以生成完整性为优先。

### 模块划分

**深度模块（可独立测试）：**

- **Prompt Builder** — 输入 `EventData` + 风格提示词 + SKILL.md 内容，输出 system prompt 和 user prompt。职责：读取 SKILL.md、拼接赛事信息、注入设计指南。
- **SSE Stream** — 输入 AI 流式响应的 `ReadableStream`，输出格式化的 SSE 事件流。职责：chunk 解析、事件格式化（`code` / `done` / `error` 事件类型）、错误处理。
- **Code Generator** — 输入 `EventData` + 风格提示词，输出流式 `ReadableStream`。职责：调用 AI API（stream: true）、组合 prompt builder 和 SSE stream。

**UI 模块：**

- **Code Stream Viewer** — 等宽字体代码面板，支持逐行追加、自动滚动、行号显示。
- **Landing Preview iframe** — 接收 HTML 字符串，通过 `srcDoc` 实时渲染。
- **Generating Page** — 双栏布局：左代码流 + 右 iframe 预览。SSE 连接管理、状态机（connecting → streaming → completed/error）。
- **Generate Landing Button** — 风格提示词选择（预设 + 自定义输入）。

### API 契约

**POST `/api/admin/events/[id]/generate-landing`**

- 请求体：`{ styleHint: string }`（风格提示词）
- 响应：SSE 流，事件格式：
  - `event: code\ndata: { "chunk": "<html>..." }\n\n` — 代码片段
  - `event: done\ndata: { "html": "..." }\n\n` — 完成，包含完整 HTML
  - `event: error\ndata: { "message": "..." }\n\n` — 错误
- 认证：`requireAdmin()` 鉴权

**GET `/api/admin/events/[id]/landing-status`**

- 检查该赛事是否已有落地页
- 响应：`{ hasLandingPage: boolean, templateId?: string }`

### Schema 变更

`EventLandingPage.content` 从 `Json` 类型改为 `String` 类型，存储完整 HTML 字符串。需要 Prisma migration。

### 删除的模块

- `src/lib/ai/templates.ts` — 删除
- `src/components/events/landing-page-renderer.tsx` — 删除（466 行）
- `src/lib/ai/generator.ts` 中的 `LandingPageContent` 接口和 `buildPrompt()` — 删除

### 保留的模块

- `src/lib/ai/config.ts` — 保留，读取环境变量
- `src/lib/ai/queries.ts` — 保留，更新 upsert 逻辑适配新 content 类型
- `src/app/events/[slug]/landing/page.tsx` — 改为 iframe srcDoc 渲染

## Testing Decisions

**测试原则**：只测试外部行为（输入→输出），不测试实现细节。测试应该能捕获重构导致的回归，但不限制实现方式。

**测试模块：**

1. **Prompt Builder** — 测试 prompt 模板拼接：给定 EventData + 风格提示词 + SKILL.md 内容，输出的 prompt 包含所有必要信息。测试边界情况（空字段、超长描述等）。

2. **SSE Stream** — 测试 chunk 解析：给定模拟的 AI 响应 chunk，输出正确的 SSE 事件格式。测试错误处理（AI 返回非法内容、连接中断等）。

3. **Code Generator** — 测试集成：mock AI API，验证输入输出契约。测试错误处理（API 超时、鉴权失败等）。

**参考先例**：`src/lib/reviews/ranking.test.ts` 的测试风格 — 测试纯函数的输入输出，mock 外部依赖。

## Out of Scope

1. **落地页编辑功能** — 管理员不能在 AI 生成后手动编辑 HTML 代码（后续迭代）
2. **多版本管理** — 每次重新生成会覆盖旧版本，不做版本历史
3. **暗色模式** — 生成的落地页不做暗色模式适配
4. **国际化** — 所有 prompt 和 UI 使用中文
5. **落地页 SEO** — iframe 内容对 SEO 不友好，MVP 不处理
6. **落地页性能监控** — 不追踪加载时间、渲染性能等指标
7. **AI 模型切换** — 不支持在 UI 上切换 AI 模型，使用环境变量配置
8. **批量生成** — 不支持一次为多个赛事生成落地页

## Further Notes

### 执行顺序

1. Prisma schema 迁移（content 类型变更）
2. Prompt Builder 模块 + 测试
3. SSE Stream 模块 + 测试
4. Code Generator 模块 + 测试
5. API 端点（SSE 流式）
6. UI 组件（Code Stream Viewer、Landing Preview iframe）
7. 生成进度页（双栏布局）
8. 落地页渲染页（iframe srcDoc）
9. 生成按钮（风格提示词选择）
10. 清理旧代码（templates.ts、landing-page-renderer.tsx）
11. 集成验证（`bun run lint && bun run typecheck && bun run test`）

### 风险

1. **AI 模型能力** — 小米 MiMo 模型是否能生成高质量的完整 HTML 页面需要验证。如果效果不佳，可能需要切换模型或调整 prompt。
2. **Token 消耗** — 完整代码生成消耗的 token 远多于 JSON 生成，成本可能增加 3-5 倍。
3. **生成时间** — 完整代码生成可能需要 30-60 秒，用户体验需要流式展示来缓解等待感。
4. **HTML 质量** — AI 生成的 HTML 可能有语法错误或浏览器兼容性问题，需要在 prompt 中强调标准合规性。
