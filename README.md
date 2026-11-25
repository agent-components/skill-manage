# 技能管理

## 界面说明

页面外观参考了 [SkillHub 插件页](https://skillhub.cn/plugins)。

## 它解决什么问题

技能常常留在某一个助手里。换一个助手，换一个地方，这一份就带不走。

技能管理把这一份留在你自己这边。同一份技能，任何地方都可以用。这是给你自己部署的，不是公开的技能社区。

网站用来查看和管理自己的技能：上传、更新，再按工作归进技能集。你只会看到自己的技能集和技能。

## 能做什么

技能先放在你自己的库里，再按工作归进技能集。一个技能可以挂到多个技能集，也可以先只留在库里。

## 局限

这不适合需要跑脚本的技能。它适合的是以文档为主的技能：读进去、照着做的说明。

工作如果需要一段脚本或一个程序，不要把这段脚本放进技能。可执行的东西留在技能外面，技能只用文字说明什么时候、怎样去调用。

## 架构

前后端分离的 pnpm monorepo：

```
packages/shared   纯类型、常量与工具函数（前后端共用）
packages/prisma   Prisma 7 schema 与生成的 client（单独包，直接导出 client）
apps/server       Fastify 服务：tRPC + REST 兼容层 + 领域逻辑
apps/web          React 19 + Vite + React Router v7 单页应用
```

后端只有 `apps/server` 一个应用。原先拆出的 `packages/api` 已经取消：
它名义上「框架无关」，实际却依赖了 fastify、S3 SDK 和 Prisma，
而 `apps/server` 又只有两个文件在转发它的导出——这层间接没有任何价值。

### 服务端目录

```
apps/server/src
├── config/env.ts          环境变量集中读取
├── infra/                 基础设施：prisma.ts、storage.ts（S3/MinIO）
├── modules/               领域逻辑，一个领域一个目录
│   ├── auth/              登录会话、宿主 SSO
│   ├── skills/            技能 CRUD、版本、上传包解析
│   ├── skill-sets/        技能集 CRUD 与成员管理
│   ├── skill-square/      技能广场（上游 SkillHub）对接
│   └── harness/           宿主拉取的菜单与工具清单
├── trpc/                  tRPC 上下文、根路由、各资源 router
├── http/                  REST 兼容层（宿主调用）
└── shared/                服务端内部共用：错误类型、分页、上传错误映射
```

分层约定：

- `modules/` 只依赖 `infra/` 与 `shared/`，不反向依赖；
- `trpc/` 与 `http/` 是两种传输适配层，都只调用 `modules/`，彼此不互相调用；
- 业务错误统一继承 `shared/errors.ts` 的 `AppError`（带 HTTP 状态码），
  tRPC 与 REST 各自映射，不再各写一份错误翻译。

### 数据流

- Web 端通过 `@trpc/tanstack-react-query` + TanStack Query 调用 tRPC，
  统一走 `/trpc`，鉴权用 `Authorization: Bearer <token>`。
- tRPC 上下文只依赖标准 headers（`apps/server/src/trpc/trpc.ts`），不绑定具体 HTTP 框架。
- 序列化用 `superjson`。
- Web 端引用服务端类型的方式：`import type { AppRouter } from "@skill-manage/server/router"`。

### 前端目录

```
apps/web/src
├── app/                   应用外壳：路由、布局、鉴权守卫
├── features/              按业务域切分，页面与浮层就近放置
│   ├── auth/              登录页、会话客户端
│   ├── skills/            技能列表/详情 + floats/
│   ├── skill-sets/        技能集列表/详情 + floats/
│   └── skill-square/      技能广场列表/详情 + floats/
├── components/            跨功能复用的展示组件
├── lib/                   与业务无关的工具（trpc 客户端、文件、主题）
└── styles/                全局样式
```

### REST 兼容层

Harness Admin 宿主仍按 REST 调用，`apps/server/src/http/` 保留
`/api/openapi/*` 与 `/api/harness/*`：

- `GET /api/harness/menus`、`GET /api/harness/tools`
- `/api/openapi/skills*`、`/api/openapi/skill-sets*`、`/api/openapi/skill-square*`

每个资源一个 `*.routes.ts` 文件，公共部分在 `http/openapi/helpers.ts`。
Web 应用本身不再使用这些 REST 接口。

## 开发

```bash
pnpm install
pnpm db:generate   # 生成 Prisma Client
pnpm db:push       # 同步数据库结构
pnpm dev           # 并行启动 server(3001) 与 web(5173)
```

Web 开发服务器把 `/trpc` 与 `/api` 代理到 `http://localhost:3001`
（可用 `VITE_API_TARGET` 覆盖）。

### 构建与检查

```bash
pnpm build       # shared → prisma → server → web
pnpm typecheck   # 全 workspace 类型检查
```

## 环境变量

见 `.env.example`：`DATABASE_URL`、`MINIO_*`（对象存储）、`HARNESS_ORIGIN`（宿主 SSO 源）等。
