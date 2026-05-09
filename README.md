# AI 赛事业务管理平台

AI 赛事管理平台 MVP，支撑核心赛事流程：赛事配置 → 报名 → 作品提交 → 评委评分 → 排名公示。

## 系统截图

### 首页

![首页](docs/screenshots/home.png)

### 管理后台 — 赛事列表

![管理后台](docs/screenshots/admin-events.png)

## 技术栈

- **框架：** Next.js 16 (App Router)
- **语言：** TypeScript
- **数据库：** Prisma ORM
- **认证：** Auth.js (Google OAuth)
- **UI：** Tailwind CSS v4 + shadcn/ui
- **测试：** Vitest
- **运行时：** Bun

## 快速开始

```bash
# 安装依赖
bun install

# 配置环境变量
cp .env.sample .env.local
# 编辑 .env.local 填写 DATABASE_URL、AUTH_SECRET 等

# 数据库迁移
bun run db:migrate

# 启动开发环境
bun run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

## 项目架构

```
20260317-sspt/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── admin/             # 管理后台页面
│   │   ├── api/               # API 路由
│   │   ├── events/            # 赛事相关页面
│   │   ├── judge/             # 评委评分页面
│   │   └── my/                # 用户个人中心
│   ├── components/            # React 组件
│   │   ├── ui/                # shadcn/ui 基础组件
│   │   ├── events/            # 赛事相关组件
│   │   ├── projects/          # 项目/作品组件
│   │   ├── registrations/     # 报名相关组件
│   │   └── reviews/           # 评审相关组件
│   ├── lib/                   # 工具函数与业务逻辑
│   │   ├── events/            # 赛事 Server Actions
│   │   ├── projects/          # 项目/作品逻辑
│   │   ├── registrations/     # 报名逻辑
│   │   ├── reviews/           # 评审逻辑
│   │   ├── access-control.ts  # 权限控制
│   │   ├── auth-guards.ts     # 认证守卫
│   │   ├── auth-session.ts    # 会话管理
│   │   ├── action-result.ts   # Server Action 返回格式
│   │   └── prisma.ts          # Prisma Client 单例
│   ├── auth.ts                # Auth.js 实例配置
│   ├── auth.config.ts         # Auth.js Provider 配置
│   └── proxy.ts               # 请求代理/中间件
├── prisma/
│   └── schema.prisma          # 数据库模型定义
├── public/                    # 静态资源
└── e2e/                       # E2E 测试
```

### 核心模块说明

| 模块 | 说明 |
|------|------|
| **Auth.js** | 认证系统，支持 GitHub/Google OAuth，管理员角色映射 |
| **Prisma** | ORM 层，定义 User、Event、Registration、Project、ProjectScore、EventJudge 等模型 |
| **Server Actions** | 业务逻辑层，处理赛事 CRUD、报名、作品提交、评分等操作 |
| **权限控制** | 双层防护：`proxy.ts` 拦截请求 + `auth-guards.ts` 服务端校验 |

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器 |
| `bun run lint` | 运行 ESLint |
| `bun run typecheck` | 类型检查 |
| `bun run test` | 运行测试 |
| `bun run db:migrate` | 创建并应用迁移 |
| `bun run db:studio` | 打开 Prisma Studio |
