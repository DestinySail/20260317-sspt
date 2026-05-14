# PRD: 落地页生成进度页改造 & 多版本管理

## Problem Statement

当前落地页生成进度页使用双栏布局（左代码流 + 右预览），体验问题：
1. 界面丑，两栏等宽显得拥挤
2. 看不到 AI 的"思考过程"，只有干巴巴的代码流
3. 重新生成会直接覆盖旧版本，无法保留历史版本对比
4. 没有计时器，用户不知道是否卡住了

## Solution

改造进度页为单栏流式布局，新增多版本管理能力：

1. **进度页**：thinking 滚动（聊天气泡追加）+ 代码打字机（边缘渐变模糊）+ 计时器
2. **多版本**：每次生成新增一条记录，保存后默认不激活，需手动选择
3. **管理后台**：赛事列表加落地页按钮，赛事编辑页加版本列表

## User Stories

1. As a 管理员, I want 在生成落地页时看到 AI 的思考过程（而非只有代码），so that 我能了解 AI 的设计思路
2. As a 管理员, I want thinking 块像聊天消息一样追加展示，so that 我能顺着思路往下看，不用担心内容消失
3. As a 管理员, I want 看到当前已用时间（2m2s 格式），so that 我知道生成是否在进行中
4. As a 管理员, I want 看到无限循环的进度动画，so that 我不会被卡住的界面吓到
5. As a 管理员, I want AI 开始写代码时，thinking 区域自动折叠，so that 屏幕专注在代码上
6. As a 管理员, I want 代码在固定区域内像打字机一样逐字输出，so that 我能实时看到代码生长
7. As a 管理员, I want 代码区域上下边缘有渐变模糊效果，so that 视觉上有沉浸感
8. As a 管理员, I want 生成完成后有预览按钮，so that 我能在新标签页快速查看落地页效果
9. As a 管理员, I want 生成完成后有保存按钮，so that 我能把落地页存入数据库
10. As a 管理员, I want 保存后默认不激活，so that 我有时间检查后再手动决定让用户看到哪个版本
11. As a 管理员, I want 在赛事列表页看到哪些赛事已有落地页，so that 我能快速找到落地页入口
12. As a 管理员, I want 在赛事列表页点击"查看落地页"直接打开该赛事当前激活的落地页，so that 我不需要先编辑再找落地页
13. As a 管理员, I want 在赛事编辑页看到该赛事的全部落地页版本列表，so that 我能对比不同版本
14. As a 管理员, I want 在赛事编辑页选择一个版本设为激活状态，so that 前台用户看到的就是这个版本
15. As a 管理员, I want 再次生成落地页时，不覆盖之前的版本，so that 我有版本历史可以回滚
16. As a 参赛者, I want 访问赛事落地页时看到当前激活的那个版本，so that 管理员有充分的时间检查后再发布
17. As a 参赛者, I want 落地页在移动端也能正常显示，so that 我可以在手机上浏览赛事
18. As a 参赛者, I want 落地页加载速度快，so that 我不需要等待很长时间

## Implementation Decisions

### Schema 变更

```prisma
model EventLandingPage {
  id        String   @id @default(uuid())
  eventId   String               // 去掉了 @unique
  version   Int                  // 新增：每次生成 +1
  isActive  Boolean @default(false) // 新增：是否激活展示
  styleHint String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId, version]) // 同一赛事版本号唯一
  @@index([eventId])
}
```

### SSE 事件类型新增

原事件：`code`（代码片段）、`done`（完成）、`error`（错误）

新增事件：
- `thinking` — thinking 文本片段，JSON格式 `{ "chunk": "..." }`
- `phase` — 阶段切换通知，JSON格式 `{ "phase": "code" }`，通知前端 thinking 阶段结束，开始代码阶段

阶段判断依据：检测到代码开始标记（` ```html` 或 `<!DOCTYPE` 或 `<html`）时，发送 `phase: code` 事件，前端切换到代码打字机状态。

### 状态机

```
idle → connecting → [streaming] → (thinking 阶段)
  [phase: code 检测到代码开始]
    → (code 阶段：thinking 折叠，代码打字机)
  [done 事件到达]
    → (completed 阶段：显示预览+保存)
error → (error 阶段)
```

### 生成进度页布局（单栏）

```
┌──────────────────────────────────────────┐
│ ← 返回赛事列表 │ 赛事名称      连接中...  │ ← header
│                            [计时: 0:05]  │
├──────────────────────────────────────────┤
│                                          │
│  [thinking bubble 1]                     │
│  [thinking bubble 2]                     │
│  [thinking bubble 3] ← 向上滚动追加      │
│                                          │
│  ── 思考过程（已折叠）──  ← 点击展开     │
│                                          │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  [代码打字机区域 fixed-height]           │ ← 边缘渐变模糊
│  <html>...                              │
│                                          │
├──────────────────────────────────────────┤
│  [预览] [保存] [丢弃]                    │ ← completed 阶段
└──────────────────────────────────────────┘
```

### 计时器

- 格式：`M:SS`（如 `0:05`、`2:32`）
- 实现：useEffect + setInterval，每秒更新
- 状态为 `idle`/`error` 时隐藏

### 代码打字机边缘模糊

CSS 实现：`mask-image: linear-gradient(transparent 0%, black 15%, black 85%, transparent 100%)`

### 保存逻辑变更

当前：`upsertEventLandingPage`（覆盖）

改为：
1. 查询该赛事 `MAX(version)`
2. `prisma.eventLandingPage.create({ data: { eventId, version: maxVersion + 1, isActive: false, styleHint, content } })`
3. 返回新记录（含 id 和 version）

### 前台落地页路由

`/events/[slug]/landing` — 读取该赛事 `isActive: true` 的那条 `EventLandingPage`。

若没有激活版本：显示"暂无落地页"提示（而非报错）。

### 管理后台改造

**赛事列表页**：
- Table 新增一列"落地页"，有激活版本时显示"查看落地页"按钮（新标签页），无版本时显示"未生成"
- 按钮指向 `/events/[slug]/landing`（前台落地页路由）

**赛事编辑页**：
- 落地页生成按钮保留（跳转 generating 页面）
- 新增"落地页版本"区块：列表展示所有版本，显示 version、isActive 状态、createdAt
- 每行操作：查看（新标签页）、激活（设为 isActive: true）
- 当前激活版本行高亮

### API 变更

**POST `/api/admin/events/[id]/save-landing`** 响应中新增 `version` 字段返回。

**POST `/api/admin/events/[id]/activate-landing`**（新建）：
- 请求体：`{ landingPageId: string }`
- 逻辑：将该赛事所有版本的 `isActive` 设为 false，再将指定版本设为 true
- 响应：`{ success: true }`

**GET `/api/admin/events/[id]/landing-pages`**（新建）：
- 返回该赛事所有 `EventLandingPage` 记录，按 version 降序
- 含 `isActive` 和 `createdAt`

### 删掉的模块/组件

- `LandingPreviewIframe` 组件 — 不再需要
- `generating-page-content.tsx` 中的双栏布局逻辑

## Testing Decisions

**测试原则**：只测外部行为，不测实现细节。

**测试模块**：

1. **Thinking 分块逻辑** — 给定流式文本输入（含代码开始标记），验证分段是否正确
   - thinking 文本遇到 ` ```html` 时切块
   - thinking 文本遇到 `<!DOCTYPE` 时切块
   - 纯代码文本（无 thinking）直接进 code 阶段

2. **版本号计算** — 给定 eventId，验证 `MAX(version) + 1` 逻辑

3. **计时器** — 验证 M:SS 格式渲染，验证 start/stop 行为

**参考先例**：`src/lib/ai/code-generator.test.ts` 的测试风格

## Out of Scope

1. **落地页编辑功能** — AI 生成后管理员手动编辑 HTML
2. **版本对比 UI** — 管理员在后台对比两个版本的差异
3. **落地页历史删除** — 删除旧版本落地页
4. **暗色模式** — 生成的落地页不做暗色模式适配
5. **国际化** — 所有 prompt 和 UI 使用中文
6. **批量生成** — 一次为多个赛事生成落地页