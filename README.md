# Bilibili 电子宠物

一个面向 B 站评论区的自动回复系统，当前代码库已完成 **Python 后端向 TypeScript 后端迁移**，并配套了独立的 Vite 管理后台。

项目核心目标是把“评论采集 → 风险判断 → 回复生成 → 审核/发布 → 审计追踪”串成一条可运营、可观测、可人工干预的链路。

---

## 最新版本状态

当前正式版本：**v1.1.0**

v1.1.0 是当前仓库状态下的正式发布基线，定位为 **Bilibili-first 正式版**。

本版本已完成：

- TypeScript 后端正式基线固化
- Bilibili 主平台链路运行能力
- companion 电子宠物页面接入与体验增强
- 管理后台 pet / platform / memory 等运营能力增强
- `/readiness` foundation / delivery / product 多层门禁升级
- backend / frontend / pet-companion-web / douyin-sidecar 本地测试与构建验证

平台支持范围：

| 平台 | 状态 |
|---|---|
| Bilibili | 正式支持 |
| Douyin / 抖音 | 试点能力，代码与本地验证已具备，远端 rollout 仍需 verified sidecar endpoint 与 `PLATFORM_DOUYIN_*` 配置 |
| Kuaishou / 快手 | 预留脚手架，不作为正式交付能力 |
| QQ | 暂不支持 |
| 微信 | 暂不支持 |

Release: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.1.0

---

## 1. 当前状态

- 后端：TypeScript + Fastify + Prisma + BullMQ
- 前端：Vite 原生管理后台
- 数据库：当前默认路径已统一为 SQLite / libSQL，Prisma schema 使用 SQLite provider，主服务通过 `@prisma/adapter-libsql` 连接 `file:` 数据库
- 队列：BullMQ + Redis
- 部署：Docker 多阶段构建；根目录 `docker-compose.yml` 默认编排 migrate / API / Worker / Redis，并通过共享 volume 挂载 SQLite 数据文件
- 集成能力：支持 B 站评论轮询、B 站凭证管理、视频监控、手动触发轮询、发布网关、审计与后台运营
- Companion：`pet-companion-web` 当前已由 backend 以 `/companion` 静态托管，`/companion/state-v2` 也已上线；但完整电子宠物闭环仍属于 partial 范围
- 最新 repo-local 验证快照：`2026-04-13` 本地候选版本已验证，backend `221`、frontend `39`、`pet-companion-web` `19` tests 与三端 builds 全部通过
- 本地 strict 门禁已通过：`staging:check:strict --base-url http://127.0.0.1:18002 --env-file ../.env.strict.local.example --api-key strict-local-key`
- expanded-scope preflight 已通过：`npm --prefix backend-ts run staging:check -- --preflight-only --expanded-scope-trial --env-file ../.env.expanded-scope.preflight.example`
- 权威客户交付基线：`WFS-bilibili-delivery-readiness-20260408` 记录的 `2026-04-08` public-domain native Bilibili `GO` 仍是最后一条已签收 baseline
- 当前远端运行状态：pet-core companion 与 admin pet/platform 路由已上线，但 Douyin 外部平台试点仍未完成远端接入配置

> 注意：仓库内仍残留部分 Python/FastAPI/Celery 风格命名；阅读与运行时优先以当前 `backend-ts/`、`frontend/`、`pet-companion-web/` 与最新 workflow truth sources 为准。

---

## 2. 功能概览

### 评论处理链路

- 接收评论事件并入队处理
- 去重与冷却判断
- 安全检查与回复决策
- 结合知识库 / 搜索 / 角色卡生成回复
- 进入人工审核或自动发布流程
- 记录发布日志与可观测事件

### B 站集成

- 管理 B 站账号凭证
- 管理监控视频列表
- 定时轮询视频评论
- 将新评论注入内部处理流水线
- 支持启用真实 B 站发布

### 管理后台

- 仪表盘
- 任务管理
- 每日指标
- 知识库管理
- Memory 管理（spaces / items / grants / identity links）
- 角色卡管理
- 风格配置
- 网关日志
- 审计日志
- B 站集成管理
- 查询页
- 交付诊断视图（`foundation_ready` / `delivery_ready` / canonical capability blockers）

### 运维与审计

- 健康检查与就绪检查
- 发布日志查询
- 审计日志导出
- 每日指标统计
- Observability 汇总

---

## 3. 技术栈

### 后端

- Node.js 20+
- TypeScript 5
- Fastify 5
- Prisma 7
- BullMQ 5
- ioredis
- dotenv
- Vitest

### 前端

- Vite 5
- 原生 ES Module
- 原生 CSS
- 无 React / Vue 依赖

### 基础设施

- Docker / Docker Compose
- Redis 7
- 当前数据层实现：SQLite / libSQL 适配
- 默认 compose 使用共享 SQLite volume 与 Redis

---

## 4. 项目结构

```text
.
├─ backend-ts/                  # TypeScript 后端
│  ├─ src/
│  │  ├─ index.ts              # 进程启动入口
│  │  ├─ main.ts               # Fastify 服务与全部路由
│  │  ├─ models/               # 领域实体
│  │  ├─ services/             # 评论采集、决策、安全、生成、发布等服务
│  │  └─ workers/              # BullMQ worker 与任务处理
│  ├─ prisma/
│  │  └─ schema.prisma         # Prisma 数据模型
│  ├─ config/                  # 配置文件
│  ├─ Dockerfile               # 后端镜像构建（也会打包前端）
│  └─ package.json
├─ frontend/                    # 管理后台
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.js               # 前端入口
│  │  ├─ api/                  # API 请求封装
│  │  ├─ components/           # 页面组件
│  │  ├─ pages/                # 各页面渲染逻辑
│  │  ├─ utils/                # 工具函数
│  │  └─ style.css             # 全局样式
│  └─ package.json
├─ pet-companion-web/           # 独立 companion web（已接入 backend 托管与 pet-core 适配，产品范围仍属 partial）
│  ├─ src/                      # companion UI + backend/local adapter
│  ├─ test/                     # prototype tests
│  └─ package.json
├─ docker-compose.yml           # 本地/容器编排入口
├─ docker-compose.ghcr.yml      # GHCR 镜像部署编排
├─ docker-compose.hostnet.yml   # host network 部署变体
├─ .env.example                 # 环境变量示例
└─ README.md
```

---

## 5. 后端架构说明

### 5.1 API 服务

启动入口：`backend-ts/src/index.ts:1`

- 通过 `createServer()` 创建 Fastify 应用
- 默认监听 `0.0.0.0:8000`
- Docker 中容器端口为 `3000`，宿主机默认映射 `18000`

核心实现：`backend-ts/src/main.ts`

职责包括：

- 初始化 Fastify 服务
- 注册健康检查接口
- 暴露管理后台 API
- 暴露网关发布 API
- 暴露 B 站集成 API
- 处理任务查询、审批、重试、导出、统计等接口

### 5.2 Worker 服务

入口：`backend-ts/src/workers/worker-main.ts:1`

职责：

- 消费 `comment-event` 队列
- 执行评论事件处理任务
- 按配置周期执行 B 站评论轮询
- 管理优雅关闭

Worker 同时承担两类职责：

1. **BullMQ 消费者**：处理评论事件任务
2. **轮询调度器**：当 `BILIBILI_POLL_ENABLED=true` 时周期性运行轮询逻辑

### 5.3 服务层

`backend-ts/src/services/` 主要包含：

- `collector.ts`：评论采集与事件注入
- `decider.ts`：是否回复、采取何种动作
- `safety.ts`：安全检查
- `generator.ts`：回复生成
- `publisher.ts`：发布逻辑
- `knowledge.ts`：知识库上下文
- `search.ts`：搜索增强
- `bilibili-client.ts`：B 站 API 访问
- `bilibili-poller.ts`：轮询视频评论并注入处理链路
- `credential-crypto.ts`：B 站凭证加解密
- `db-queries.ts`：数据库读写封装
- `observability.ts`：可观测性事件记录

### 5.4 队列模型

队列基础设施：`backend-ts/src/workers/task-queue.ts:1`

特性：

- 基于 BullMQ
- 默认重试 3 次
- 指数退避
- 自动清理完成 / 失败任务
- 支持可重试 / 不可重试错误分类

### 5.5 数据模型

Prisma 模型定义：`backend-ts/prisma/schema.prisma:1`

主要表：

- `Comment`：评论原始数据
- `ReplyJob`：回复任务
- `UserState`：用户状态 / 冷却信息
- `PublishLog`：发布日志
- `KnowledgeEntry`：知识库
- `RoleCard`：角色卡
- `OperationAuditLog`：操作审计日志
- `ObservabilityEvent`：可观测事件
- `BilibiliCredential`：B 站凭证
- `BilibiliVideo`：B 站视频监控配置

---

## 6. 前端架构说明

前端入口：`frontend/src/main.js:1`
页面骨架：`frontend/index.html:1`

当前管理后台基于 Vite 原生前端实现，不依赖 UI 框架。

### 页面模块

从 `frontend/src/main.js:15` 可见，当前页面包括：

- `dashboard`：仪表盘
- `jobs`：任务管理
- `daily-metrics`：每日指标
- `knowledge`：知识库
- `memory`：memory spaces / grants / identity links 管理
- `role-cards`：角色卡
- `profiles`：风格配置
- `gateway`：网关
- `audit`：审计日志
- `bilibili`：B 站集成
- `query`：查询

### 登录方式

- 管理后台通过 API Key 登录
- API Key 保存在 `sessionStorage`
- 前端通过请求 `/api/admin/overview` 验证 API Key 是否可用

### 主题能力

前端内置主题切换：

- 默认主题
- dark
- sepia

---

## 7. 主要接口

以下接口来自 `backend-ts/src/main.ts` 的实际路由定义。

### 7.0 交付模式与环境变量

- 本地默认（mock/manual_queue）：`LLM_PROVIDER=mock`、`PUBLISHER_MODE=manual_queue`，不需要外部密钥，`/readiness.delivery_ready` 预期为 false。
- Preflight（仅检查配置，不请求运行时）：准备一份 env 文件，包含真实链路所需的密钥；运行 `npm run staging:check -- --preflight-only --env-file <file>` 可看到缺失项。关键字段：`LLM_PROVIDER`(非 mock 时需要 `LLM_API_KEY`)、`SEARCH_API_KEY`/`SEARCH_CX`、`PUBLISHER_MODE=webhook` 时的 `PUBLISHER_WEBHOOK_URL`/`PUBLISHER_WEBHOOK_TOKEN`，或开启原生发布时的 `BILIBILI_*` 凭证与开关。
- Strict（运行时就绪 + 管理面）：需要 API 进程可访问，`API_KEY` 可用；检查 `/health`、`/admin`、`/readiness`、`/api/admin/*`，并验证交付能力矩阵。仍可在无真实密钥时运行，但会暴露缺失项。
- Webhook 交付（strict 基础上）：`PUBLISHER_MODE=webhook`，且 `PUBLISHER_WEBHOOK_URL`、`PUBLISHER_WEBHOOK_TOKEN` 已配置；`delivery_capabilities` 中 webhook 应为 configured。
- 原生 B 站交付 / real-chain：`BILIBILI_ENABLED=true`、`BILIBILI_PUBLISH_ENABLED=true`，并提供凭证（DB 记录或环境三件套 `BILIBILI_SESSDATA`/`BILIBILI_BILI_JCT`/`BILIBILI_BUVID3`，可选 `BILIBILI_BUVID4`）和加密钥 `CREDENTIAL_ENCRYPTION_KEY`；`staging:check -- --strict --pre-release-real-chain` 会要求 `delivery_ready=true` 与各 release_gates 为 true。这里的 `real_auth_ready` 现在依赖运行时 auth probe，不再把“字段齐全”直接视为通过。

### 7.1 基础检查

- `GET /health`
- `GET /readiness`

补充说明：

- `/health` 只返回最基础的存活状态，响应形如 `{ ok: true }`
- `/readiness` 会同时检查数据库、Redis 与关键配置，返回 `ready`、`database`、`redis`、`config`、`publish`、`kill_switch`、`foundation_ready`、`delivery_ready`、`foundation_blockers`、`delivery_blockers`、`delivery_signals`、`delivery_capability_blockers`、`delivery_capabilities`、`bilibili_diagnostics` 等字段
- 可将 `/health` 用作轻量存活探针，把 `/readiness` 用作就绪探针

调用示例：

```bash
curl http://127.0.0.1:18000/health
curl http://127.0.0.1:18000/readiness
```

典型响应：

```json
{
  "ready": true,
  "foundation_ready": true,
  "delivery_ready": false,
  "foundation_blockers": [],
  "delivery_blockers": [
    "bilibili:publish_mode_not_delivery_capable:manual_queue",
    "bilibili:delivery_diagnostics_not_ready"
  ],
  "delivery_signals": {
    "kill_switch_enabled": false,
    "polling_requested": false,
    "delivery_path_ready": false,
    "effective_publish_mode": "manual_queue"
  },
  "delivery_capability_blockers": [
    "llm_generation",
    "search_enrichment"
  ],
  "delivery_capabilities": {
    "capabilities": [
      { "capability": "llm_generation", "status": "fallback_only" },
      { "capability": "search_enrichment", "status": "missing_inputs" },
      { "capability": "webhook_publish", "status": "inactive" },
      { "capability": "native_bilibili_publish", "status": "inactive" }
    ]
  }
}
```

排查建议：

- `ready=false` 优先看 `foundation_blockers`，通常是数据库或 Redis 不可用
- `ready=true` 但 `delivery_ready=false` 时，说明服务本身可启动，但发布链路或 B 站链路还没满足交付条件
- `kill_switch_enabled=true` 会直接出现在 `delivery_blockers` 中，适合先查环境变量 `KILL_SWITCH`

### 7.2 发布网关

- `POST /gateway/publish`
- `POST /gateway/publish/bilibili`
- `POST /gateway/publish/douyin`
- `POST /gateway/publish/kuaishou`
- `GET /gateway/publish-logs`

补充说明：

- 入口会先校验请求体，再按配置依次校验 `x-api-key`、`Authorization: Bearer <GATEWAY_TOKEN>`、`x-signature`
- 只要配置了 `API_KEY`、`GATEWAY_TOKEN`、`GATEWAY_HMAC_SECRET`，调用方就必须同时满足对应校验
- 平台专用路由在平台未启用时会返回 `403 { detail: 'platform_disabled' }`
- 常见错误响应包括：`400 { detail: 'invalid_payload' }`、`401 { detail: 'unauthorized' }`、`401 { detail: 'missing_signature' }`、`401 { detail: 'invalid_signature' }`
- 请求体最少需要 `comment_id` 与 `reply_text`；可选字段包括 `force_publish`、`source`、`trace_id`
- 路由会生成或透传 `trace_id`，优先级是：请求体 `trace_id` → 请求头 `x-trace-id` → 服务端生成
- 发布接口采用幂等保留日志策略；相同平台 + `comment_id` + 相同回复文本再次提交时会返回 `duplicate=true`
- 即使发布失败，业务层通常也会返回 `200`，再通过响应体中的 `ok`、`published`、`reason` 区分结果

请求头示例：

```http
x-api-key: your-admin-api-key
Authorization: Bearer your-gateway-token
x-signature: sha256=...
x-trace-id: trace-demo-001
Content-Type: application/json
```

调用示例：

```bash
curl -X POST http://127.0.0.1:18000/gateway/publish \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -H "Authorization: Bearer your-gateway-token" \
  -H "x-signature: sha256=your-signature" \
  -H "x-trace-id: trace-demo-001" \
  -d '{
    "comment_id": "1953012345678900000",
    "reply_text": "收到，稍后给你补一个更完整的说明。",
    "force_publish": false,
    "source": "bili-pet-bot",
    "trace_id": "trace-demo-001"
  }'
```

典型成功响应：

```json
{
  "ok": true,
  "published": true,
  "reason": "published",
  "comment_id": "1953012345678900000",
  "published_at": "2026-04-02T12:34:56.000Z",
  "trace_id": "trace-demo-001"
}
```

典型失败响应：

```json
{
  "ok": false,
  "published": false,
  "reason": "manual_queue",
  "comment_id": "1953012345678900000",
  "trace_id": "trace-demo-001"
}
```

典型幂等重放响应：

```json
{
  "ok": true,
  "published": false,
  "duplicate": true,
  "reason": "idempotent_replay",
  "trace_id": "trace-demo-001"
}
```

排查建议：

- 一进接口就返回 `401 unauthorized`，优先检查 `x-api-key` 与 `Authorization` 是否同时命中当前配置
- 返回 `401 missing_signature` / `invalid_signature` 时，检查签名是否基于实际请求体字段计算，而不是基于格式化后的其它版本
- 返回 `200` 但 `published=false` 时，不代表接口失败，而是发布策略、人工审核队列或平台交付链路未满足
- 如果需要按平台强制走特定发布器，用 `/gateway/publish/<platform>`；同时确认对应平台已启用
- 建议把响应里的 `trace_id` 与 `/gateway/publish-logs`、审计日志一起关联排查

### 7.3 管理后台总览与统计

- `GET /api/admin/overview`
- `GET /api/admin/metrics/overview`
- `GET /api/admin/observability/summary`
- `GET /api/metrics/overview`
- `GET /api/metrics/daily`
- `GET /metrics/daily`

补充说明：

- 管理后台接口普遍要求 `x-api-key` 与环境变量 `API_KEY` 一致，否则返回 `401 { detail: 'unauthorized' }`
- `/api/admin/overview` 响应形如 `{ ok: true, ...overview }`，用于前端登录后探测 API Key 是否可用
- `/api/admin/metrics/overview` 返回的是纯 overview 对象，不额外包 `ok: true`
- `overview` 中通常包含 `totals` 与 `generated_at`；`totals` 会汇总评论、任务、发布、队列、依赖状态等多类计数
- 管理后台前端当前优先使用 `/api/admin/*` 与 `/api/*` 路径；`/metrics/daily` 仍保留为顶层兼容入口
- `/api/metrics/daily` 与 `/metrics/daily` 当前返回相同的 `{ ok, days, totals, items }` 结构，适合日报与趋势图
- `/api/admin/observability/summary`、`/api/admin/metrics/overview` 用于后台聚合统计，而 `/api/metrics/overview` 更偏通用指标查询入口

调用示例：

```bash
curl http://127.0.0.1:18000/api/admin/overview \
  -H "x-api-key: your-admin-api-key"

curl "http://127.0.0.1:18000/api/metrics/daily?days=7" \
  -H "x-api-key: your-admin-api-key"
```

`/api/admin/overview` 典型响应：

```json
{
  "ok": true,
  "totals": {
    "comments": 128,
    "jobs": 91,
    "pending_jobs": 6,
    "done_jobs": 72,
    "failed_jobs": 3,
    "published_jobs": 58,
    "gateway_publish_attempts_last_24h": 24,
    "gateway_publish_success_last_24h": 20,
    "gateway_publish_failure_last_24h": 2,
    "gateway_publish_duplicate_last_24h": 2,
    "database_connected": 1,
    "redis_connected": 1,
    "kill_switch_enabled": 0
  },
  "generated_at": "2026-04-02T12:34:56.000Z"
}
```

`/metrics/daily` 典型响应：

```json
{
  "ok": true,
  "days": 7,
  "totals": {
    "queued": 12,
    "published": 9,
    "manual_queue": 2,
    "skipped": 1
  },
  "items": [
    {
      "date": "2026-04-01",
      "queued": 12,
      "published": 9,
      "manual_queue": 2,
      "blocked": 0,
      "dedupe_skipped": 0,
      "skipped": 1,
      "status_breakdown": {
        "manual_queue": 2,
        "published": 9,
        "queued": 12,
        "skipped": 1
      },
      "total": 24
    }
  ]
}
```

排查建议：

- 前端登录失败时，先直接请求 `/api/admin/overview`，这是后台实际用来验证 API Key 的探测接口
- 如果 `/api/admin/overview` 成功但某个统计接口异常，优先区分是鉴权问题还是聚合查询本身失败
- 看概览时可优先关注 `gateway_publish_*`、`database_connected`、`redis_connected`、`kill_switch_enabled` 这些运维相关字段

### 7.4 任务与评论管理

这一组接口同时覆盖后台管理与通用查询：

- `GET /api/admin/jobs`
- `POST /api/jobs/:job_id/retry`
- `POST /api/jobs/:job_id/approve`
- `POST /api/jobs/approve-batch`
- `POST /api/jobs/retry-batch`
- `GET /api/jobs/:job_id`
- `GET /api/comments/:comment_id`
- `POST /jobs/:job_id/retry`
- `POST /jobs/:job_id/approve`
- `POST /jobs/approve-batch`
- `POST /jobs/retry-batch`
- `GET /jobs/:job_id`
- `GET /jobs`
- `GET /comments`
- `GET /comments/:comment_id`
- `GET /export/jobs.csv`

补充说明：

- `/api/admin/jobs` 是后台任务列表接口，要求 `x-api-key`；支持 `status`、`limit`、`offset`，默认 `limit=50`，上限 `1000`
- `/api/jobs/:job_id`、`/api/jobs/:job_id/retry`、`/api/jobs/:job_id/approve`、`/api/jobs/approve-batch`、`/api/jobs/retry-batch`、`/api/comments/:comment_id` 是为当前管理后台前端保留的兼容入口；对应的顶层 `/jobs/*`、`/comments/:comment_id` 仍可继续用于脚本和联调
- `/jobs/:job_id/retry` 与 `/api/jobs/:job_id/retry` 都支持在请求体中覆盖 `force_long`、`style_profile`、`role_profile`、`role_card_key`
- `/jobs/:job_id/approve` 与 `/api/jobs/:job_id/approve` 都支持在审批时附带 `style_profile`、`role_profile`、`role_card_key`
- `/jobs/approve-batch` 与 `/api/jobs/approve-batch` 都需要 `job_ids` 数组；`/jobs/retry-batch` 与 `/api/jobs/retry-batch` 需要 `job_ids`，并支持 `force_long`
- `/comments` 返回 `{ ok: true, total, items }`，按 `created_at desc` 排序；分页参数默认 `limit=50`，上限 `500`
- `/export/jobs.csv` 返回 `text/csv`，默认导出 `500` 条，最大 `5000` 条，可按 `status` 过滤

后台任务列表示例：

```bash
curl "http://127.0.0.1:18000/api/admin/jobs?status=manual_queue&limit=20&offset=0" \
  -H "x-api-key: your-admin-api-key"
```

典型成功响应：

```json
{
  "ok": true,
  "total": 2,
  "items": [
    {
      "id": 101,
      "status": "manual_queue",
      "comment_id": "comment-20260402-001",
      "style_profile": "normal",
      "role_profile": "default",
      "created_at": "2026-04-02T12:34:56.000Z"
    }
  ]
}
```

单任务重试示例：

```bash
curl -X POST http://127.0.0.1:18000/jobs/101/retry \
  -H "Content-Type: application/json" \
  -d '{
    "force_long": true,
    "style_profile": "empathy",
    "role_profile": "comfort",
    "role_card_key": "healer"
  }'
```

批量审批示例：

```bash
curl -X POST http://127.0.0.1:18000/jobs/approve-batch \
  -H "Content-Type: application/json" \
  -d '{
    "job_ids": [101, 102, 103]
  }'
```

评论列表典型响应：

```json
{
  "ok": true,
  "total": 128,
  "items": [
    {
      "id": 88,
      "comment_id": "comment-20260402-001",
      "platform": "bilibili",
      "content": "今天怎么样？",
      "created_at": "2026-04-02T12:34:56.000Z"
    }
  ]
}
```

典型错误响应：

```json
{
  "detail": "job_not_found"
}
```

```json
{
  "detail": "job_ids_required"
}
```

排查建议：

- 如果后台任务页能打开但列表接口返回 `401 unauthorized`，优先确认前端保存的 `admin_api_key` 是否与服务端 `API_KEY` 一致
- `/jobs/:job_id/retry`、`/jobs/:job_id/approve` 对非法或空 `job_id` 会直接返回 `404 job_not_found`，这类情况通常是路径参数错误
- 批量审批/批量重试必须传有效正整数 `job_ids`；空数组、空字符串或无效数字都会落到 `job_ids_required`
- 导出 CSV 时如果结果为空，先核对 `status` 过滤条件，再确认当前导出上限是否截断了你需要的数据范围

### 7.5 知识库与角色配置

这组接口用于维护知识条目、风格配置、角色配置与角色卡：

- `GET /api/admin/knowledge`
- `POST /api/admin/knowledge`
- `POST /api/admin/knowledge/:entry_id/disable`
- `GET /api/admin/style-profile`
- `POST /api/admin/style-profile`
- `GET /api/admin/role-profile`
- `POST /api/admin/role-profile`
- `GET /api/admin/role-cards`
- `POST /api/admin/role-cards`
- `POST /api/admin/role-cards/:card_key`
- `POST /api/admin/role-cards/:card_key/disable`
- `POST /api/admin/role-cards/:card_key/activate`

补充说明：

- 这一组接口全部要求 `x-api-key`
- `GET /api/admin/knowledge` 支持 `limit`、`offset`；默认 `limit=200`，上限 `1000`
- 新增知识条目时，`category`、`title`、`content` 都是必填；缺失时分别返回 `category_required`、`title_required`、`content_required`
- 禁用知识条目时，非法 `entry_id` 会返回 `404 { "detail": "knowledge_not_found" }`
- `POST /api/admin/style-profile` 仅允许：`auto`、`empathy`、`meme`、`normal`
- `POST /api/admin/role-profile` 仅允许：`auto`、`default`、`comfort`、`playful`
- `GET /api/admin/role-cards` 支持 `limit`、`offset`；默认 `limit=200`，上限 `1000`
- 新建角色卡时，`key`、`name` 必填；`description`、`system_prompt`、`tone`、`constraints`、`enabled` 可选
- 角色卡 `key` 会被转成小写并截断，适合作为稳定配置键，不适合作为展示名称
- 更新角色卡使用 `POST /api/admin/role-cards/:card_key`；只有请求体里出现的字段会被更新，显式传入空 `name` 会返回 `role_card_name_required`

新增知识条目示例：

```bash
curl -X POST http://127.0.0.1:18000/api/admin/knowledge \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{
    "category": "reply_policy",
    "title": "夜间低打扰",
    "content": "23:00-07:00 优先短回复，避免连续追问。"
  }'
```

典型成功响应：

```json
{
  "ok": true,
  "item": {
    "id": 12,
    "category": "reply_policy",
    "title": "夜间低打扰",
    "content": "23:00-07:00 优先短回复，避免连续追问。",
    "enabled": true
  }
}
```

设置风格配置示例：

```bash
curl -X POST http://127.0.0.1:18000/api/admin/style-profile \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{
    "style_profile": "empathy"
  }'
```

新建角色卡示例：

```bash
curl -X POST http://127.0.0.1:18000/api/admin/role-cards \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{
    "key": "healer",
    "name": "安抚型",
    "description": "优先给情绪支持",
    "system_prompt": "你是一个温和、稳定、善于安抚的电子宠物。",
    "tone": { "warm": true },
    "constraints": { "avoid_scolding": true },
    "enabled": true
  }'
```

典型参数错误响应：

```json
{
  "detail": "invalid_style_profile"
}
```

```json
{
  "detail": "role_card_key_required"
}
```

排查建议：

- 新增知识条目失败时，先检查三项必填字段是否都是非空字符串；后端会先做 `trim()` 再校验
- 设置风格或角色配置时，值必须落在允许集合内；拼写错误、大小写不一致都会在归一化后被判为非法
- 角色卡更新接口支持部分更新；只切换启停状态时，优先使用 `/disable` 和 `/activate`，避免误覆盖其他字段
- 如果后台能读取角色卡列表但创建或更新失败，先检查 `key` 和 `name` 是否为空，再看 `tone`、`constraints` 是否传成对象

### 7.6 审计与网关日志

这一组接口对应运维、审计与发布链路排查：

- `GET /api/admin/audit/summary`
- `GET /api/admin/audit-logs/summary`
- `GET /api/admin/gateway/logs`
- `GET /api/admin/gateway/publish-logs`
- `GET /api/audit-logs`
- `GET /api/audit-log`
- `GET /audit-logs`
- `GET /audit-logs/summary`
- `GET /export/audit-logs.csv`
- `GET /gateway/publish-logs`

补充说明：

- 这一组接口都要求 API Key；后台前缀接口使用 `x-api-key`，顶层通用接口通过 `checkApiKey(...)` 鉴权
- `/api/admin/audit/summary` 与 `/api/admin/audit-logs/summary` 都支持 `days`、`action`、`ok`；默认 `days=7`，范围 `1~90`
- `/api/admin/audit/summary` 会在响应中补上 `ok: true`；`/api/admin/audit-logs/summary` 直接返回汇总结果
- `/api/admin/gateway/logs`、`/api/admin/gateway/publish-logs` 支持 `comment_id`、`limit`；默认 `limit=50`，上限 `200`
- `/api/admin/gateway/logs` 会返回 `ok: true`；`/api/admin/gateway/publish-logs` 更接近原始日志列表
- `/api/audit-logs`、`/api/audit-log` 与 `/audit-logs` 当前共享同一套查询行为；其中 `/api/audit-log` 是为现有前端保留的 legacy typo 兼容入口
- `/audit-logs` 支持 `action`、`ok`、`target_id`、`limit`、`offset`；代码会读取 `trace_id`，但当前查询条件并未使用该字段
- `/api/audit-logs`、`/api/audit-log`、`/audit-logs` 返回的都是 `{ ok, summary, items }`，其中 `summary` 至少包含 `total`、`returned`、`limit`
- `/export/audit-logs.csv` 返回 `text/csv`，CSV 表头固定为 `id,action,target_type,target_id,ok,status,trace_id,payload,created_at`
- 顶层 `/gateway/publish-logs` 支持 `status`、`limit`、`offset`，默认 `limit=50`，上限 `500`

审计汇总示例：

```bash
curl "http://127.0.0.1:18000/api/admin/audit/summary?days=7&ok=true" \
  -H "x-api-key: your-admin-api-key"
```

典型成功响应：

```json
{
  "ok": true,
  "days": 7,
  "totals": {
    "audit_logs": 42
  },
  "by_action": {
    "approve_job": 10,
    "retry_job": 6
  },
  "by_status": {
    "duplicate": 2,
    "published": 28
  },
  "by_result": {
    "ok": 38,
    "failed": 4
  }
}
```

审计明细查询示例：

```bash
curl "http://127.0.0.1:18000/audit-logs?action=retry_job&ok=true&limit=100" \
  -H "x-api-key: your-admin-api-key"
```

网关发布日志查询示例：

```bash
curl "http://127.0.0.1:18000/gateway/publish-logs?status=published&limit=50" \
  -H "x-api-key: your-admin-api-key"
```

顶层发布日志典型响应：

```json
{
  "ok": true,
  "total": 20,
  "items": [
    {
      "id": 301,
      "platform": "bilibili",
      "canonical_comment_id": "comment-20260402-001",
      "comment_id": "comment-20260402-001",
      "reply_hash": "sha256:...",
      "source": "gateway",
      "status": "published",
      "published_at": "2026-04-02T12:34:56.000Z",
      "failure_reason": null,
      "created_at": "2026-04-02T12:34:50.000Z"
    }
  ]
}
```

排查建议：

- 如果审计列表里 `payload` 看起来像对象而不是字符串，这是接口层主动做了 JSON 解析，属预期行为
- `/api/admin/gateway/logs` 与 `/api/admin/gateway/publish-logs` 的区别主要在响应包装；写脚本时不要假设两者都有相同的顶层 `ok` 字段
- 导出审计 CSV 时，如需 `trace_id` 或状态字段，优先使用 `/export/audit-logs.csv`，因为表头已经把这些排障字段展开了
- `/audit-logs` 代码虽然读取了 `trace_id` 参数，但当前查询条件并未真正按 `trace_id` 过滤；传参后看不到筛选效果时，应按当前实现理解
- 发布日志排查时，先用 `/gateway/publish-logs?status=published|failed|duplicate` 看结果，再回到审计日志按 `action` 与 `ok` 交叉确认是业务拒绝、重复命中还是实际发布失败

### 7.7 B 站集成管理

- `GET /api/admin/bilibili/status`
- `GET /api/admin/bilibili/videos`
- `POST /api/admin/bilibili/videos`
- `POST /api/admin/bilibili/videos/:videoId/toggle-poll`
- `DELETE /api/admin/bilibili/videos/:videoId`
- `POST /api/admin/bilibili/videos/:videoId/sync`
- `POST /api/admin/bilibili/poll`
- `GET /api/admin/bilibili/credentials`
- `POST /api/admin/bilibili/credentials`
- `POST /api/admin/bilibili/credentials/:credentialId/activate`
- `DELETE /api/admin/bilibili/credentials/:credentialId`

补充说明：

- 所有后台 B 站管理接口都要求 `x-api-key`
- 新增监控视频时，`bvid` 必填，且必须匹配 `^BV[a-zA-Z0-9]{10}$`；否则会返回 `bvid_required` 或 `invalid_bvid_format`
- `GET /api/admin/bilibili/videos` 支持 `poll_enabled`、`limit`、`offset`
- `poll_enabled` 默认是 `true`
- 触发 `/api/admin/bilibili/poll` 或 `/videos/:videoId/sync` 可手动执行一次同步
- `/api/admin/bilibili/credentials` 列表接口不会直接返回完整密钥，只返回 `has_sessdata`、`has_bili_jct`、脱敏后的 `buvid3` 以及时间字段
- 新建凭证时，`name`、`sessdata`、`bili_jct`、`buvid3` 必填；首条凭证会自动设为激活状态
- 凭证写入前会对敏感 Cookie 字段做加密，明文不会直接落库

新增监控视频示例：

```bash
curl -X POST http://127.0.0.1:18000/api/admin/bilibili/videos \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{
    "bvid": "BV1xx411c7mD",
    "poll_enabled": true
  }'
```

典型成功响应：

```json
{
  "ok": true,
  "item": {
    "id": 3,
    "bvid": "BV1xx411c7mD",
    "poll_enabled": true
  }
}
```

典型参数错误响应：

```json
{
  "detail": "invalid_bvid_format"
}
```

新增凭证示例：

```bash
curl -X POST http://127.0.0.1:18000/api/admin/bilibili/credentials \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{
    "name": "主账号",
    "sessdata": "your-sessdata",
    "bili_jct": "your-bili-jct",
    "buvid3": "your-buvid3",
    "buvid4": "optional-buvid4",
    "expires_at": "2026-12-31T23:59:59.000Z"
  }'
```

凭证列表典型响应：

```json
{
  "ok": true,
  "items": [
    {
      "id": 1,
      "name": "主账号",
      "is_active": true,
      "has_sessdata": true,
      "has_bili_jct": true,
      "buvid3": "your-buv...",
      "expires_at": "2026-12-31T23:59:59.000Z",
      "last_used_at": null,
      "created_at": "2026-04-02T12:34:56.000Z",
      "updated_at": "2026-04-02T12:34:56.000Z"
    }
  ]
}
```

排查建议：

- 视频新增失败时，先确认 `bvid` 是否是标准 BV 号，而不是 aid 或短链接中的其它标识
- 如果轮询一直没有抓到评论，先确认视频仍是 `poll_enabled=true`，再手动触发 `/api/admin/bilibili/poll` 或 `/videos/:videoId/sync`
- 凭证写入成功但实际调用 B 站仍失败时，重点检查 Cookie 是否过期，以及 `CREDENTIAL_ENCRYPTION_KEY` 是否稳定一致；旧变量 `BILIBILI_COOKIE_ENCRYPTION_KEY` 仍兼容
- 凭证列表只会返回脱敏字段；如果你在接口响应里找不到明文 Cookie，这是预期行为

### 7.8 评论事件注入入口

除管理后台接口外，系统还暴露一组评论事件注入入口：

- `POST /events/comment`
- `POST /events/comment/poller`
- `POST /events/comment/official`
- `POST /events/comment/bilibili`
- `POST /events/comment/douyin`
- `POST /events/comment/kuaishou`

补充说明：

- 这些入口会把外部评论事件统一收敛为内部 `CommentEvent`
- 不同入口会自动绑定不同 `source` / `platform`，例如 `/events/comment` 对应 `webhook`，`/events/comment/bilibili` 对应 `bilibili`
- 这些入口的硬性要求是能解析出 `comment_id`
- 如果请求体无法被解析，会返回 `400 { detail: 'invalid_<source>_payload: ...' }` 或具体字段错误
- `comment_id` 是必填字段，缺失时返回 `400 { detail: 'comment_id_required' }`
- 成功后会进入 `ingestCommentEvent()`，后续再进入队列与回复流水线
- 即使后续入队失败，只要评论已经成功落库，接口仍可能返回成功，后续由后台补处理

B 站评论事件示例：

```bash
curl -X POST http://127.0.0.1:18000/events/comment/bilibili \
  -H "Content-Type: application/json" \
  -d '{
    "comment_id": "1953012345678900000",
    "video_id": "BV1xx411c7mD",
    "user_id": "12345678",
    "content": "催更一下部署文档",
    "parent_id": null,
    "trace_id": "trace-comment-001"
  }'
```

轮询入口兼容格式示例：

```bash
curl -X POST http://127.0.0.1:18000/events/comment/poller \
  -H "Content-Type: application/json" \
  -d '{
    "rpid": "1953012345678900000",
    "oid": "123456789",
    "mid": "12345678",
    "message": "这是轮询抓到的新评论",
    "trace_id": "trace-comment-002"
  }'
```

典型成功响应：

```json
{
  "ok": true,
  "queued": true,
  "comment_id": "1953012345678900000",
  "trace_id": "trace-comment-001"
}
```

典型重复响应：

```json
{
  "ok": true,
  "message": "duplicate_ignored",
  "comment_id": "1953012345678900000",
  "trace_id": "trace-comment-001"
}
```

典型错误响应：

```json
{
  "detail": "comment_id_required"
}
```

排查建议：

- 如果是第三方 webhook 对接，先确认请求体能被映射出 `comment_id`
- `/events/comment/poller`、`/events/comment/bilibili` 等入口支持多种别名字段，可兼容不同来源的评论结构
- 返回 `duplicate_ignored` 说明评论已经入库过，通常不是错误，而是去重保护已生效
- 如怀疑事件已收到但后续未处理，先记下返回的 `trace_id`，再结合任务表、审计日志、可观测事件一起排查

---

## 8. 环境变量说明

环境变量示例文件：`.env.example:1`
运行时默认值与就绪检查摘要构造：`backend-ts/src/main.ts:435`

当前环境变量信息主要来自两处：
1. `.env.example`：提供示例值与历史兼容变量名
2. `backend-ts/src/main.ts:435` 的 `buildDefaultSettings()`：定义主服务启动时直接读取的一组核心变量

如果 `.env.example`、`docker-compose.yml` 与实际运行行为不完全一致，以当前 TypeScript 代码中的读取逻辑为准。

### 8.1 基础连接

- `DATABASE_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `KILL_SWITCH`

当前 `CELERY_*` 仍保留历史命名，但 TypeScript 实现已经使用 BullMQ / Redis，不再使用 Celery。

当前 `.env.example` 默认使用 SQLite / libSQL 风格的 `file:` 数据库路径；运行时应以 `backend-ts/prisma/schema.prisma`、共享 Prisma 工厂与实际部署环境变量为准。

### 8.2 LLM 相关

- `.env.example` 中保留的示例变量：
  - `LLM_PROVIDER`
  - `LLM_MODEL`
  - `LLM_BASE_URL`
  - `LLM_API_KEY`
  - `LLM_TIMEOUT_SECONDS`
  - `LLM_RETRY_ATTEMPTS`
  - `LLM_RETRY_WAIT_SECONDS`
  - `LLM_FALLBACK_TO_MOCK`
- 当前 `backend-ts/src/main.ts:441` 明确读取并纳入运行时设置的字段只有：
  - `LLM_PROVIDER`
  - `LLM_FALLBACK_TO_MOCK`

其余 LLM 变量虽保留在 `.env.example` 中，但是否生效仍应以对应模块实现为准。

### 8.3 鉴权与签名

- `API_KEY`
- `GATEWAY_TOKEN`
- `GATEWAY_HMAC_SECRET`

### 8.4 Publisher 相关

- `.env.example` 中可见的发布变量：
  - `PUBLISHER_MODE`
  - `PUBLISHER_WEBHOOK_URL`
  - `PUBLISHER_WEBHOOK_TOKEN`
  - `PUBLISHER_TIMEOUT_SECONDS`
  - `PUBLISHER_HMAC_SECRET`
- 当前 `backend-ts/src/main.ts:443` 在主服务启动时直接读取 `PUBLISHER_MODE`
- `real_publish` 当前直接复用 B 站运行时凭证，不再单独读取 `PUBLISHER_REAL_PUBLISH_URL` / `PUBLISHER_REAL_PUBLISH_TOKEN`
- Publisher 变量是否生效仍应结合具体发布链路判断：
  - `webhook` 依赖 `PUBLISHER_WEBHOOK_URL`
  - `real_publish` 依赖 B 站运行时凭证
  - `manual_queue` / `simulated` 不要求额外外部发布地址

### 8.5 B 站集成

- `.env.example` 中可见的 B 站相关变量：
  - `BILIBILI_ENABLED`
  - `BILIBILI_POLL_ENABLED`
  - `BILIBILI_POLL_INTERVAL_SECONDS`
  - `BILIBILI_PUBLISH_ENABLED`
  - `BILIBILI_CREDENTIAL_ID`
  - `BILIBILI_RATE_LIMIT_PER_MINUTE`
  - `BILIBILI_SESSDATA`
  - `BILIBILI_BILI_JCT`
  - `BILIBILI_BUVID3`
  - `BILIBILI_BUVID4`
  - `CREDENTIAL_ENCRYPTION_KEY`
- 当前 `backend-ts/src/main.ts:444` 在主服务启动时直接读取并纳入运行时设置的字段是：
  - `BILIBILI_ENABLED`
  - `BILIBILI_POLL_ENABLED`
  - `BILIBILI_POLL_INTERVAL_SECONDS`
  - `BILIBILI_PUBLISH_ENABLED`

其中 `BILIBILI_ENABLED`、`BILIBILI_POLL_ENABLED`、`BILIBILI_PUBLISH_ENABLED` 属于全局行为开关；`BILIBILI_CREDENTIAL_ID`、`BILIBILI_RATE_LIMIT_PER_MINUTE`、`BILIBILI_BUVID4`、`CREDENTIAL_ENCRYPTION_KEY` 等字段则由 B 站凭证、轮询或发布子模块分别消费。旧变量 `BILIBILI_COOKIE_ENCRYPTION_KEY` 仍兼容，但不再作为首选命名。

### 8.6 多平台发布开关

- 当前 `backend-ts/src/main.ts:451` 还直接读取一组多平台发布变量：
  - `PLATFORM_BILIBILI_ENABLED`
  - `PLATFORM_DOUYIN_ENABLED`
  - `PLATFORM_KUAISHOU_ENABLED`
  - `PLATFORM_BILIBILI_PUBLISH_SOURCE`
  - `PLATFORM_DOUYIN_PUBLISH_SOURCE`
  - `PLATFORM_KUAISHOU_PUBLISH_SOURCE`
- 这些变量当前未出现在 `.env.example` 中，但已经进入主服务运行时设置。

如果接入 `/gateway/publish/:platform`，还应同时配置平台启停变量和对应的 `*_PUBLISH_SOURCE` 来源标识。

### 8.7 风格与角色默认值

- `STYLE_PROFILE_DEFAULT` 与 `ROLE_PROFILE_DEFAULT` 属于当前实现已使用、但未在 `buildDefaultSettings()` 中统一汇总的配置。
- `backend-ts/src/main.ts:755` / `backend-ts/src/main.ts:772` 表明管理后台在写入风格配置和角色配置时，会改写 `process.env` 中的默认值。
- `backend-ts/src/workers/worker-main.ts:28` 表明 Worker 启动时会读取 `ROLE_PROFILE_DEFAULT`，未设置时回退到 `doro`。

这组配置更接近进程级默认值：既可通过环境变量提供初始值，也可能被部分管理接口在运行时改写。

### 8.8 常用配置建议

#### 本地开发最小配置

- 使用测试数据库 URL
- Redis 指向本地容器或本地服务
- `LLM_PROVIDER=mock`
- `BILIBILI_ENABLED=false`
- `BILIBILI_PUBLISH_ENABLED=false`
- `PUBLISHER_MODE=manual_queue`

#### 生产环境配置

- `API_KEY`、`GATEWAY_TOKEN`、`GATEWAY_HMAC_SECRET` 使用强随机值
- 关闭 `LLM_FALLBACK_TO_MOCK`
- 明确配置 `CREDENTIAL_ENCRYPTION_KEY`
- 如果启用真实发布，明确手动审核与自动发布策略

---

## 9. 本地开发

### 9.1 安装前端依赖

```bash
cd frontend
npm install
```

### 9.2 安装后端依赖

```bash
cd backend-ts
npm install
```

### 9.3 生成 Prisma Client

```bash
cd backend-ts
npx prisma generate
```

### 9.4 启动后端开发服务

```bash
cd backend-ts
npm run dev
```

默认监听 `http://127.0.0.1:8000`

### 9.5 启动 Worker

当前仓库没有单独的 `npm run worker` 脚本；Worker 入口是 `backend-ts/src/workers/worker-main.ts:24`。

如果已经构建完成：

```bash
cd backend-ts
node --env-file=../.env dist/workers/worker-main.js
```

如果开发期尚未构建，先执行：

```bash
cd backend-ts
npm run build
node --env-file=../.env dist/workers/worker-main.js
```

Worker 启动后会：

- 消费 `comment-event` 队列
- 在 `BILIBILI_POLL_ENABLED=true` 时启用轮询调度
- 默认轮询间隔读取 `BILIBILI_POLL_INTERVAL_SECONDS`，默认值 `300`
- 收到 `SIGTERM` / `SIGINT` 时优雅关闭

### 9.6 启动前端开发服务

前端脚本定义见 `frontend/package.json:6`。

```bash
cd frontend
npm run dev
```

如需构建静态资源：

```bash
cd frontend
npm run build
```

如需本地预览构建产物：

```bash
cd frontend
npm run preview
```

### 9.7 运行测试

```bash
cd backend-ts
npm test
```

覆盖率：

```bash
cd backend-ts
npm run test:coverage
```

---

## 10. Docker 部署

根目录 `docker-compose.yml:1` 已提供完整编排。

### 启动

```bash
docker compose up -d --build
```

如需先看迁移与启动日志，也可以先前台启动一次：

```bash
docker compose up --build
```

默认服务：

- `migrate`：执行 Prisma migrate deploy
- `api`：启动 Fastify API
- `worker`：启动 BullMQ Worker + B 站轮询调度
- `redis`：Redis
- `sqlite-data`：通过共享 volume 持久化 SQLite 数据文件

### 单机 Docker 最小落地步骤

1. 以 `.env.example:1` 为参考创建自己的 `.env`
2. 至少将这些值替换为真实部署配置：
   - `API_KEY`
   - `GATEWAY_TOKEN`
   - `GATEWAY_HMAC_SECRET`
   - `DATABASE_URL`
   - `CREDENTIAL_ENCRYPTION_KEY`（如果启用 B 站凭证存储；旧变量 `BILIBILI_COOKIE_ENCRYPTION_KEY` 仍兼容）
3. 执行 `docker compose up -d --build`
4. 用 `/health` 与 `/readiness` 检查服务
5. 再访问管理后台或调用管理接口验证鉴权

这就是仓库默认的单机自托管路径：直接使用根目录 `docker-compose.yml` 启动构建、迁移、API、Worker、Redis，并通过共享 volume 挂载 SQLite 数据文件。

### 默认端口

- API：`${API_PORT:-18000}` → 容器 `3000`
- Redis：`6379`

### 镜像构建方式

当前 `backend-ts/Dockerfile:1` 采用多阶段构建：

1. 先构建 `frontend/` 静态资源
2. 再构建 `backend-ts/` 的 TypeScript 产物
3. 最终镜像内包含：
   - `dist/`：后端运行代码
   - `public/admin`：前端管理后台静态文件
   - `config/`：运行配置目录

默认容器镜像同时承载 API 与后台前端资源，不需要再单独部署前端容器。

### 启动顺序

默认 compose 编排中：

- `migrate` 使用共享 SQLite volume 执行 `npx prisma migrate deploy`
- `api` 与 `worker` 依赖 `migrate` 成功完成
- `api` 还会暴露宿主机端口，`worker` 只在内部消费队列与执行轮询

### 健康检查

```bash
curl http://127.0.0.1:18000/health
curl http://127.0.0.1:18000/readiness
```

### Staging 验证入口

当前仓库提供了一个跨平台 staging 验证脚本，能够串联 `/health`、`/readiness`、管理后台资产、`/api/admin/overview`、`/api/admin/bilibili/status` 以及 pre-release real chain 合同检查。

如果你还没启动服务，或者想先确认“真实交付还差哪些密钥/开关/凭证”，可以先跑 env 级 preflight：

```bash
cd backend-ts
npm run staging:check -- --preflight-only --env-file .env.staging --report ../staging-preflight.json
```

这条命令会直接汇总 4 类外部交付前提：
- `LLM` 实际生成
- `search` 搜索增强
- `webhook` 发布
- `native Bilibili` 原生发布

它能帮你尽早发现缺失项，但它**不能**证明：
- Redis / 数据库在目标运行时里真的可达
- `/readiness`、`/api/admin/*`、后台静态资源已经正常工作
- 原生 B 站链路当前一定存在可用的活动 DB 凭证

这些仍然要通过 `--strict` 或 `--pre-release-real-chain` 的运行时校验来确认。

当前仓库的 `cloud-validate` CI 会先做 preflight，并把 `preflight_ready` 当作阻断门禁；只有 preflight 通过后，才会继续执行 strict 校验，并在启动应用前准备一个已迁移的临时 SQLite 数据库与 `API_KEY`。

这里的 CI preflight 主要用于防止 wrapper / workflow / env 契约漂移。它会注入一组 CI placeholder 输入来确保能力矩阵本身保持完整；这并不等价于真实外部交付已经可用。

另外，默认分支 release 路径和手动 release dispatch 现在也会对 `PRE_RELEASE_SMOKE_BASE_URL` / `PRE_RELEASE_SMOKE_API_KEY` 采用 fail-closed 策略：缺少这些 secrets 时，release workflow 会直接失败，而不是静默跳过 real-chain 校验。

如果你在本地跑 `--strict`，还需要满足两条额外前提：
- 服务进程应从 `backend-ts/` 目录启动，确保 `/admin` 能正确找到 `public/admin`
- 本地必须有可达的 Redis 运行时，否则 `/readiness` 会保持 `ready=false`

常用方式：

```bash
cd backend-ts
npm run staging:check -- --base-url http://127.0.0.1:18000

cd backend-ts
npm run staging:check -- --preflight-only --env-file .env.staging --report ../staging-preflight.json

cd backend-ts
npm run staging:check -- --base-url http://127.0.0.1:18000 --api-key "$API_KEY" --strict

cd backend-ts
npm run staging:check -- --base-url http://127.0.0.1:18000 --api-key "$API_KEY" --strict --pre-release-real-chain --report ../staging-report.json
```

也可以直接使用仓库根目录包装脚本：

```bash
bash smoke.sh preflight --report ./staging-preflight.json
bash smoke.sh expanded-preflight --report ./expanded-scope-preflight.json
bash smoke.sh strict --base-url http://127.0.0.1:18002 --api-key "$API_KEY"
bash smoke.sh real-chain --base-url http://127.0.0.1:18002 --api-key "$API_KEY"

pwsh ./smoke.ps1 preflight --report .\staging-preflight.json
pwsh ./smoke.ps1 expanded-preflight --report .\expanded-scope-preflight.json
pwsh ./smoke.ps1 strict --base-url http://127.0.0.1:18002 --api-key "$env:API_KEY"
pwsh ./smoke.ps1 real-chain --base-url http://127.0.0.1:18002 --api-key "$env:API_KEY"
```

如果你的目标只是快速复现一个**本地 strict-capable** 运行态，而不是手工启动 Redis、API、再自己拼 `staging-check` 参数，可以使用仓库根目录的一键 helper：

```powershell
Copy-Item .env.strict.local.example .env.strict.local
pwsh ./rehearse-local.ps1 strict

Copy-Item .env.expanded-scope.preflight.example .env.expanded-scope.preflight
pwsh ./smoke.ps1 expanded-preflight --env-file .\.env.expanded-scope.preflight

Copy-Item .env.real-chain.local.example .env.real-chain.local
pwsh ./rehearse-local.ps1 real-chain
```

或在 shell 环境中：

```bash
cp .env.strict.local.example .env.strict.local
bash ./rehearse-local.sh strict

cp .env.expanded-scope.preflight.example .env.expanded-scope.preflight
bash ./smoke.sh expanded-preflight --env-file ./.env.expanded-scope.preflight

cp .env.real-chain.local.example .env.real-chain.local
bash ./rehearse-local.sh real-chain
```

这个 helper 会自动：

1. 构建 `backend-ts`
2. 启动 `docker compose` 的 `redis`
3. 用 `node --env-file=<env file>` 启动本地 API
4. 运行 strict 校验
5. 停掉 API，默认也会停掉 Redis

注意：

- `.env.strict.local.example` 里的值是为了**本地 strict 合同演练**准备的 placeholder，不代表真实外部交付已经可用。
- `.env.expanded-scope.preflight.example` 用来检查 expanded scope 的 `PLATFORM_DOUYIN_*` 前置条件是否齐全；它不证明远端 endpoint/WAF 已经打通。
- 2026-04-13 已完成一次本地 strict 合同演练：`staging:check:strict --base-url http://127.0.0.1:18002 --env-file ../.env.strict.local.example --api-key strict-local-key` 全通过；这只能证明本地 strict-capable 运行态成立，不能替代远端 Douyin trial 证据。
- expanded scope 最终 strict 验收的说明模板和 JSON 骨架在：
  - `backend-ts/EXPANDED_SCOPE_STAGING_TEMPLATE.md`
  - `backend-ts/staging-report.expanded-scope.template.json`
- `rehearse-local.ps1` / `rehearse-local.sh` 默认会按模式选择 env 文件：
  - `strict` → `.env.strict.local`
  - `real-chain` → `.env.real-chain.local`
- `real-chain` 仍然需要真实 native auth 可用的目标运行时；`.env.real-chain.local.example` 只是字段模板，不会靠 placeholder 自动通过。
- helper 在 `real-chain` 模式下会对 `BILIBILI_*` 凭证和 `CREDENTIAL_ENCRYPTION_KEY` 做 fail-fast 校验；如果还是模板值，会在启动 Redis/API 之前直接退出。

如果用 wrapper 模式（`preflight` / `strict` / `real-chain`）但没显式传 `--report`，脚本会自动把机器可读证据写到：

- `./.artifacts/staging/<mode>-<UTC timestamp>.json`

可通过 `SMOKE_REPORT_DIR` 覆盖这个默认目录。若显式传入 `--report`（或环境变量 `REPORT_PATH`），`staging-check` 会在 preflight、通过、失败三种结果下都写出 JSON 报告，便于 CI 与人工留档。

strict / real-chain 报告里现在还会额外写出：

- `runtime_summary`：目标运行时通过 `/readiness` 与 `/api/admin/bilibili/status` 暴露出来的真实状态
- `input_scopes`：说明 checker 进程自身看到的 env/preflight 和 target runtime 状态是两个不同视角
- `checker_env_differs_from_target_runtime`：当 checker 侧 preflight 仍显示缺项，但目标运行时 strict 已通过时，会给出显式 warning，避免把报告误读成“自相矛盾”

推荐顺序是：

1. 先跑 `--preflight-only`，确认真实交付所需的 env / secret / publish mode 前提是否齐全。
2. 再跑 baseline 或 `--strict`，确认运行中的 API、后台资源和 readiness 是否正常。
3. 只有要做原生 B 站发布演练时，才跑 `--pre-release-real-chain`。

完整说明与环境变量矩阵见 [backend-ts/STAGING_VALIDATION.md](backend-ts/STAGING_VALIDATION.md)。

### GHCR 镜像部署变体

`docker-compose.ghcr.yml:1` 是一个 **override 文件**，用于覆盖默认 compose 中 `migrate` / `api` / `worker` 的镜像来源；它本身不是完整编排，需要和根目录 `docker-compose.yml` 组合使用：

```bash
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d
```

实际覆盖内容包括：

- `migrate` / `api` / `worker` 都直接使用 `ghcr.io/smith-106/bilibili-electronic-pet:latest`
- 配置了 `pull_policy: always`
- 仍保留与默认 compose 相同的启动命令分工：
  - `migrate` → `npx prisma migrate deploy`
  - `api` → `node dist/index.js`
  - `worker` → `node dist/workers/worker-main.js`

适用于已有预构建镜像、需要快速启动服务的场景。

常见使用顺序是：

1. 先准备好 `.env`
2. 确认部署机器已经能拉取 `ghcr.io/smith-106/bilibili-electronic-pet:latest`
3. 执行组合命令启动服务
4. 用 `docker compose logs api worker migrate` 检查首轮启动结果
5. 再执行 `/health` 与 `/readiness` 验证 API 是否就绪

GHCR override 只替换镜像来源，数据库、Redis、环境变量与端口定义仍来自根目录 `docker-compose.yml`。

### Host Network 部署变体

`docker-compose.hostnet.yml:1` 同样是一个 **override 文件**，用于覆盖默认 compose 的网络模式，也要和根目录 `docker-compose.yml` 叠加使用：

```bash
docker compose -f docker-compose.yml -f docker-compose.hostnet.yml up -d
```

它当前只调整了这些项：

- `api` 使用 `network_mode: host`
- `api` 的 `ports` 被清空，不再做显式端口映射
- `worker` 同样运行在 `network_mode: host`

这种模式适用于部分 Linux 服务器直接接入宿主网络的场景，但要注意：

- 端口冲突会直接落在宿主机上
- Windows / macOS 下的 Docker Desktop 一般不如 Linux 主机模式直观
- 网络隔离能力弱于 bridge 模式

如果按这一模式部署，建议再检查：

1. 宿主机上的目标端口没有被其他进程占用
2. 你的服务发现、反向代理、监控方式确实需要 host network
3. `api` 容器内监听地址仍然是 `0.0.0.0`
4. 对外暴露策略已经在宿主机层面控制好

这个 override 只调整网络模式，不改变镜像、环境变量或 `db` / `redis` 编排；因此它是网络接入策略切换，不是独立部署清单。

### 环境变量与部署的关系

部署时优先确认这些变量：

- `DATABASE_URL`
- `API_KEY`
- `GATEWAY_TOKEN`
- `GATEWAY_HMAC_SECRET`
- `PUBLISHER_MODE`
- `PUBLISHER_WEBHOOK_URL`
- `BILIBILI_ENABLED`
- `BILIBILI_POLL_ENABLED`
- `BILIBILI_PUBLISH_ENABLED`
- `CREDENTIAL_ENCRYPTION_KEY`

- `.env.example:1` 中给出的 `DATABASE_URL` 仍带有 Python 时代风格的示例值，实际部署要与当前 Prisma / 运行环境匹配
- `BILIBILI_ENABLED=true` 且 `BILIBILI_PUBLISH_ENABLED=true` 时，会优先走 B 站原生发布，覆盖普通 `PUBLISHER_MODE`
- 如果启用网关签名校验，调用方必须与 `GATEWAY_HMAC_SECRET` 保持一致
- 如果接入 `/gateway/publish/:platform`，还应补充检查 `PLATFORM_BILIBILI_ENABLED`、`PLATFORM_QQ_ENABLED`、`PLATFORM_DOUYIN_ENABLED`、`PLATFORM_KUAISHOU_ENABLED` 以及对应的 `*_PUBLISH_SOURCE`
- 如果你要本地把 Douyin sidecar 一起跑起来，可以使用：

```bash
docker compose --profile sidecar up -d douyin-sidecar
```

默认会暴露：

- `http://127.0.0.1:8081/health`
- `http://127.0.0.1:8081/publish`

本地接主项目时可设置：

- `PLATFORM_DOUYIN_ENABLED=true`
- `PLATFORM_DOUYIN_WEBHOOK_URL=http://127.0.0.1:8081/publish`
- `PLATFORM_DOUYIN_WEBHOOK_TOKEN=<与 DOUYIN_SIDECAR_TOKEN 相同>`
- `PLATFORM_DOUYIN_PUBLISH_SOURCE=douyin-sidecar-trial`

如果你要本地把 QQ sidecar 一起跑起来，可以使用：

```bash
docker compose --profile sidecar up -d qq-sidecar
```

默认会暴露：

- `http://127.0.0.1:8082/health`
- `http://127.0.0.1:8082/publish`

本地接主项目时可设置：

- `PLATFORM_QQ_ENABLED=true`
- `PLATFORM_QQ_WEBHOOK_URL=http://127.0.0.1:8082/publish`
- `PLATFORM_QQ_WEBHOOK_TOKEN=<与 QQ_SIDECAR_TOKEN 相同>`
- `PLATFORM_QQ_PUBLISH_SOURCE=qq-sidecar`

如果 QQ sidecar 要直连 NapCat / OneBot HTTP，可以额外设置：

- `QQ_DRIVER_MODE=onebot_http`
- `QQ_ONEBOT_URL=http://127.0.0.1:3000`
- `QQ_ONEBOT_TOKEN=<NapCat/OneBot access token>`

当前 `onebot_http` 模式优先支持两类目标：

- 群聊消息：通过 `container_id` 或 `routing_metadata.group_id`
- 私聊消息：通过 `routing_metadata.user_id`

如果要直接调用主服务的 `POST /gateway/publish/qq`，现在也可以显式带上 QQ 路由上下文。常用字段有：

- `canonical_id`：可选，建议传 `qq:<message_id>`
- `container_id`：群聊时的 group/chat id
- `user_id`：私聊用户 id，或作为 QQ sidecar 的补充路由信息
- `parent_external_id`：被回复的上级消息 id
- `routing_metadata`：透传给 QQ sidecar / OneBot 适配层的附加字段

群聊示例：

```json
{
  "comment_id": "message-123",
  "canonical_id": "qq:message-123",
  "container_id": "group-42",
  "user_id": "user-42",
  "parent_external_id": "message-root",
  "routing_metadata": {
    "chat_type": "group",
    "adapter": "napcat"
  },
  "reply_text": "reply text"
}
```

私聊示例：

```json
{
  "comment_id": "message-456",
  "canonical_id": "qq:message-456",
  "user_id": "user-456",
  "routing_metadata": {
    "chat_type": "private"
  },
  "reply_text": "reply text"
}
```

这些变量可按下面的层次理解：

- `.env.example`：提供示例值与历史兼容变量名
- `docker-compose.yml`：负责将一部分变量注入容器
- `backend-ts/src/main.ts:435`：定义主服务启动时直接读取的核心开关
- 其余变量可能由 Worker、B 站子模块、发布子链路或管理接口的运行时逻辑消费

---

## 11. B 站轮询与发布机制

轮询实现：`backend-ts/src/services/bilibili-poller.ts:1`
调度入口：`backend-ts/src/workers/worker-main.ts:39`
就绪诊断：`backend-ts/src/main.ts:1472`

### 11.1 轮询逻辑概述

- Worker 进程启动后持续消费 `comment-event` 队列
- 当 `BILIBILI_POLL_ENABLED=true` 时，还会注册定时轮询调度器
- 当前实现会先等待 `10` 秒预热，再按 `BILIBILI_POLL_INTERVAL_SECONDS` 周期执行轮询，默认值 `300`
- 轮询目标来自数据库中 `poll_enabled=true` 的视频记录
- 每个视频会分页抓取评论，并用 `last_rpid` 做增量判断
- 新评论写入 `Comment` 后，会继续注入统一回复流水线
- 每轮轮询后还会更新 `last_polled_at`、`last_poll_status`、`last_poll_error`、`last_rpid`

### 11.2 配置条件与行为结果

#### 只启用评论轮询

当：

- `BILIBILI_ENABLED=true`
- `BILIBILI_POLL_ENABLED=true`
- `BILIBILI_PUBLISH_ENABLED=false`

系统会持续抓取已启用视频的评论，并把新评论送入内部处理链路；是否实际发出回复，还要结合发布模式、审核策略与交付链路判断。

#### 启用 B 站原生发布

当：

- `BILIBILI_ENABLED=true`
- `BILIBILI_PUBLISH_ENABLED=true`

系统会切换到 native Bilibili publish 路径，并覆盖普通 `PUBLISHER_MODE`。就绪诊断也会优先按 `native_bilibili` 路径判断交付能力，见 `backend-ts/src/main.ts:1468`。

#### 未启用轮询

当 `BILIBILI_POLL_ENABLED=false` 时，Worker 不会注册轮询定时器，日志中会输出 `Bilibili polling disabled`；系统仍可处理其他来源注入的评论事件。

### 11.3 轮询状态字段含义

B 站视频记录里和轮询最相关的状态字段包括：

- `poll_enabled`：该视频是否参与自动轮询
- `last_rpid`：上次已处理到的最大评论 ID，用于增量判断
- `last_polled_at`：最近一次轮询时间
- `last_poll_status`：最近一次轮询结果，如 `ok`、`no_new`、`error`
- `last_poll_error`：最近一次错误原因，如 `no_aid`、`retry_exhausted`

这些字段直接影响后台对轮询状态的展示，也可用于区分“没有新评论”和“轮询失败”。

### 11.4 常见排障点

- `/readiness` 里如果出现 `worker:redis_unavailable_for_polling`，通常表示你请求了轮询，但 Redis 未连通，见 `backend-ts/src/main.ts:1492`
- 如果视频缺少 `aid` 且补取失败，轮询会把该视频标记为 `last_poll_status=error`、`last_poll_error=no_aid`，见 `backend-ts/src/services/bilibili-poller.ts:178`
- 如果评论接口连续重试后仍失败，会记录 `retry_exhausted`，见 `backend-ts/src/services/bilibili-poller.ts:195`
- 如果长时间没有新评论，但 `last_poll_status=no_new` 且 `last_polled_at` 持续更新，通常说明调度器正常，只是当前没有增量数据
- 如果 `BILIBILI_ENABLED=true` 且 `BILIBILI_PUBLISH_ENABLED=true`，但交付仍未就绪，应优先看 `/readiness` 返回的 `bilibili_diagnostics` 和 `delivery_blockers`

---

## 12. 数据流简述

### 自动回复主链路

1. 评论由 `backend-ts/src/main.ts:2100` 定义的多组事件路由统一接入，包括 `/events/comment`、`/events/comment/poller`、`/events/comment/official` 以及平台化入口 `/events/comment/bilibili`、`/events/comment/douyin`、`/events/comment/kuaishou`
2. 路由层先做字段收集与基础校验，再统一调用 `ingestCommentEvent(...)`，见 `backend-ts/src/main.ts:2126`
3. `defaultIngestCommentEvent()` 会生成或透传 `trace_id`，计算 `canonical_comment_id`，并先把评论落库到 `Comment`；如果命中唯一约束冲突，则直接返回 `duplicate_ignored`，见 `backend-ts/src/main.ts:851`
4. 评论写入后，服务会把事件投递到 BullMQ 的 `comment-event` 队列；投递载荷本身带有 `trace_id`，队列基础设施也明确将 `trace_id` 作为通用任务字段，见 `backend-ts/src/main.ts:877` 与 `backend-ts/src/workers/task-queue.ts:21`
5. Worker 进程启动后持续消费 `comment-event` 队列，入口在 `backend-ts/src/workers/worker-main.ts:24`；队列默认带 3 次重试、指数退避和失败/完成清理策略，见 `backend-ts/src/workers/task-queue.ts:35`
6. 在 Worker 处理阶段，任务会继续进入 shouldReply / safetyCheck / 去重 / 知识库与搜索增强 / 文本生成等统一回复链路；最终产出 `ReplyJob`，并根据策略决定是直接发布、进入人工审核，还是标记为跳过
7. 如果任务进入人工审核链路，管理端可通过 `/jobs/:job_id/approve`、`/jobs/:job_id/retry` 以及对应批量接口继续推进，见 `backend-ts/src/main.ts:2132`、`backend-ts/src/main.ts:2150`、`backend-ts/src/main.ts:2167`、`backend-ts/src/main.ts:2179`
8. 审核通过或自动发布时，发布链路会进入 `publishCore(...)`：先处理 `trace_id`，再校验 `x-api-key`、Bearer Token、HMAC 签名，并先执行 `reservePublishLog(...)` 预留幂等发布记录，见 `backend-ts/src/main.ts:1589`
9. 如果同一平台 + 评论 + 回复文本重复提交，发布接口会直接返回 `duplicate=true` 和 `reason=idempotent_replay`；如果实际发布失败或成功，则分别通过 `finalizePublishLog(...)` 落成失败/成功状态，见 `backend-ts/src/main.ts:1620` 与 `backend-ts/src/main.ts:1642`
10. 整个链路最后会把结果沉淀到多类记录：发布日志、`OperationAuditLog`、统计/可观测性事件；审计日志既可通过 `/audit-logs` 查询，也可通过 `/export/audit-logs.csv` 导出，其中导出头已包含 `trace_id`，见 `backend-ts/src/main.ts:2474` 与 `backend-ts/src/main.ts:2516`

### B 站主动轮询链路

1. Worker 启动时除了消费队列，还会根据 `BILIBILI_POLL_ENABLED` 决定是否注册轮询调度器，见 `backend-ts/src/workers/worker-main.ts:39`
2. 当前实现会先等待 10 秒预热，再按 `BILIBILI_POLL_INTERVAL_SECONDS` 固定周期执行 `pollAllVideos()`；如果上一轮还没结束，会直接跳过下一轮，避免重叠轮询，见 `backend-ts/src/workers/worker-main.ts:47`
3. Poller 会遍历已启用轮询的视频，拉取评论并用 `last_rpid` 做增量判断；新评论会回注到统一评论事件入口
4. B 站轮询只是评论来源之一；一旦注入成功，后续仍进入同一套 `Comment` 落库、队列投递、Worker 处理、审核/发布、日志/审计链路
5. 排查轮询问题时，既要查看 B 站视频自身的 `last_polled_at`、`last_poll_status`、`last_poll_error`、`last_rpid`，也要联动查看 ReplyJob 状态、发布日志与审计日志，而不应只看 poller 本身


---

## 13. 已知注意事项

### 13.1 历史命名尚未完全清理

项目已经迁移到 TypeScript，但仓库里仍保留一些历史命名：

- `.env.example` 中仍有 `CELERY_*` 变量名
- 部分示例值与命名仍延续 Python / FastAPI / Celery 时期的习惯

这些不影响当前实现运行，但阅读与部署时仍应以 `backend-ts/` 中的现行实现为准。

### 13.2 数据库默认入口已统一为 SQLite / libSQL

- `backend-ts/prisma/schema.prisma` 当前声明的是 SQLite provider
- 根目录 `docker-compose.yml` 默认通过共享 volume 挂载 SQLite 数据文件

当前仓库默认路径已统一为 SQLite / libSQL 风格 `file:` 数据库 URL。实际部署前，仍应确认 `DATABASE_URL`、Prisma 迁移方式与所选容器编排保持一致。

### 13.3 前端不是框架式 SPA

扩展页面时，沿用现有 `pages/ + render(container)` 模式即可。

---

## 14. 常用命令速查

### 后端

```bash
cd backend-ts
npm run dev
npm run build
npm run start
npm test
npm run test:coverage
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

### 前端

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

### 容器

```bash
docker compose up -d --build
docker compose down
```

### 组合 override 示例

```bash
# 使用 GHCR 预构建镜像
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d

# 使用 host network 变体
docker compose -f docker-compose.yml -f docker-compose.hostnet.yml up -d
```

---

## 15. 关键文件索引

### 后端入口

- `backend-ts/src/index.ts:1`
- `backend-ts/src/main.ts:1`

### Worker 与队列

- `backend-ts/src/workers/worker-main.ts:1`
- `backend-ts/src/workers/task-queue.ts:1`

### B 站集成

- `backend-ts/src/services/bilibili-poller.ts:1`
- `backend-ts/src/services/bilibili-client.ts:1`
- `backend-ts/src/services/credential-crypto.ts:1`

### 数据层

- `backend-ts/prisma/schema.prisma:1`
- `backend-ts/src/services/db-queries.ts:1`

### 前端

- `frontend/index.html:1`
- `frontend/src/main.js:1`
- `frontend/src/pages/`

### 部署

- `docker-compose.yml:1`
- `backend-ts/Dockerfile:1`
- `.env.example:1`

---

## 16. 项目现状总结

当前仓库已形成一条较完整的 TypeScript 运行链路：

1. `backend-ts/` 提供 Fastify API、管理接口、事件接入、发布网关与审计导出能力
2. `worker-main.ts` 负责消费 `comment-event` 队列，并在启用时承载 B 站轮询调度
3. `frontend/` 提供原生模块化管理后台，构建后会打包进后端镜像的 `public/admin`
4. `docker-compose.yml` 已把 `migrate`、`api`、`worker`、`redis` 串成一套可启动的最小部署拓扑
5. 当前后端同时保留了顶层 legacy 路由和管理后台前端依赖的 `/api/*` 兼容别名；继续开发时应优先按 `frontend/src/api/admin.js` 与 `backend-ts/src/main.ts` 的现行契约对齐

当前权威交付基线已不是早期的 `rollout blocked` 结论，而是 `WFS-bilibili-delivery-readiness-20260408` 中记录的原生 B 站 public-domain `GO`。也就是说，主运行链路已经有一条已签收的客户交付基线。

当前代码基线还包含两类后续演进中的扩展面：

- `backend-ts` 下的 memory / pet-core schema、repository、service 能力，当前已经暴露为 admin-management 与 companion state-v2 接口，并被 worker / 人工审批流自动写入 companion feed；它已经进入 companion runtime 支撑链路，但主发布业务契约仍以 admin/automation 为主
- `pet-companion-web/` 下的独立 Vite companion web，当前已由 backend 以 `/companion` 静态托管，并优先尝试接入 backend companion / memory API；但已实现能力仍主要停留在 pet-core starter state + `pat/feed/wake`，尚未形成完整 electronic-pet 产品闭环
- `douyin-sidecar` 首个外部平台试点已经在代码与远端治理面中存在，但远端真实 sidecar/webhook 契约尚未完成，因此当前仍不能把它描述为已签收的远端能力

因此，当前最准确的状态表述是：

1. 主运行链路已完成迁移，并继续以 `WFS-bilibili-delivery-readiness-20260408` 作为最后一条已签收 rollout baseline
2. `2026-04-13` 的本地候选版本是当前最强 repo-local 证据：backend `221`、frontend `39`、`pet-companion-web` `19` tests 与三端 builds 全部通过
3. 远端当前已经上线 pet-core companion 与 admin pet/platform 路由，但首个外部平台试点仍因 Douyin sidecar 契约未完成而保持 disabled
4. 管理后台与 Bilibili automation 面已经成熟；companion 已进入运行时集成，但完整 electronic-pet 与多平台产品能力仍只能判定为 partial

这份 README 可作为当前实现的代码导览与运行入口；阅读、排障或继续开发时，优先查看 `backend-ts/`、`frontend/`、`pet-companion-web/`、`WFS-bilibili-delivery-readiness-20260408`、`CURRENT_STATUS_2026-04-13.md` 以及当前 workflow 工件，而非旧的 Python 历史描述。
