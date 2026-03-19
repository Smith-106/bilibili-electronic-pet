# Bilibili 电子宠物

一个面向评论区自动回复的服务端项目，包含：评论事件接入、风险拦截、角色卡生成、发布网关、管理后台与审计能力。

## 功能概览

- 评论事件接入（webhook / poller / official / 多平台入口）
- **B站主动轮询** - 自动拉取B站视频评论并生成回复
- **B站真实发布** - 自动将回复发布到B站
- 自动生成回复（风格 + 长度 + 角色卡优先级）
- 安全策略（关键词、PII、人工审核队列）
- 发布网关（Bearer + HMAC 校验、幂等去重）
- 管理后台（任务列表、批量 approve/retry、趋势、审计、角色卡工作台、**B站集成管理**）
- 云端 CI（GitHub Actions：`pytest` + `docker build`）
- 云端镜像发布（GitHub Container Registry / GHCR）

## 技术栈

- FastAPI
- SQLAlchemy + Alembic
- Celery + Redis
- PostgreSQL
- Pytest
- Docker / Docker Compose

## 核心行为规则

### 角色设定优先级

生成链路按如下优先级解析角色上下文：

1. 显式 `role_card`
2. 激活 `active_role_card`
3. 兼容 `role_profile`

### Prompt 配置（`config/prompt_doro.yaml`）

已接入运行时：

- `skip_keywords`（拦截关键词）
- `action_pool`（mock 动作语气）
- `banned_words`（系统提示禁用词）
- `default_length` / `length_distribution`（长度策略与 long 扩展概率）

## 项目结构

```text
.
├─ app/
│  ├─ api/          # comments / gateway / admin
│  ├─ services/     # decider / generator / publisher / prompt_config ...
│  ├─ workers/      # celery tasks
│  ├─ models/       # ORM entities
│  ├─ static/admin/ # admin.css / admin.js（管理页静态资源）
│  ├─ schemas.py
│  └─ main.py
├─ config/
│  └─ prompt_doro.yaml
├─ migrations/
├─ .github/workflows/
│  ├─ cloud-validate.yml
│  └─ build-and-push-ghcr.yml
├─ docker-compose.yml
├─ Dockerfile
└─ requirements.txt
```

## 快速开始（本地）

### 1) 安装依赖

```bash
pip install -r requirements.txt
```

### 2) 运行测试

```bash
pytest app/tests -q
```

> 已在 `pytest.ini` 配置 `pythonpath = .`，无需额外手动设置 `PYTHONPATH`。

### 3) 启动服务（Docker）

```bash
docker compose up -d --build
```

服务启动后，API 默认监听 `http://127.0.0.1:18000`（可通过 `API_PORT` 环境变量覆盖）。

### 4) 健康检查

```bash
curl -sS http://127.0.0.1:18000/health
```

期望：

```json
{"ok": true}
```

**完整部署验证（推荐）：**

```bash
# 使用 smoke 脚本进行完整健康检查（需要设置 API_KEY）
API_KEY=your-api-key-here bash smoke.sh

# 或仅检查基础健康
curl -sS http://127.0.0.1:18000/readiness
```

**自定义端口：**

如果需要使用其他端口，可通过环境变量覆盖：

```bash
API_PORT=8080 docker compose up -d --build
# 服务将监听 http://127.0.0.1:8080
# 验证时使用：
curl -sS http://127.0.0.1:8080/health
```

## 主要接口

> 业务接口默认受 `API_KEY` 保护（见 `require_api_key`）。

### 健康检查

- `GET /health`

### 评论事件接入

- `POST /api/events/comment`
- `POST /api/events/comment/poller`
- `POST /api/events/comment/official`
- `POST /api/events/comment/bilibili`
- `POST /api/events/comment/douyin`
- `POST /api/events/comment/kuaishou`

### 任务处理

- `POST /api/jobs/{job_id}/retry`
- `POST /api/jobs/{job_id}/approve`
- `GET /api/comments/{comment_id}`（单评论详情）
- `GET /api/jobs/{job_id}`（单任务详情）
- 批量 approve / retry 与列表查询见管理页对应 API

### 发布网关

- `POST /gateway/publish`
- `POST /gateway/publish/bilibili`
- `POST /gateway/publish/douyin`
- `POST /gateway/publish/kuaishou`
- `GET /gateway/publish-logs`

### 管理页

- `GET /admin`
- 管理页前端已工程化为静态资源：
  - `/static/admin/admin.css`
  - `/static/admin/admin.js`
- 已覆盖单项诊断能力：评论详情查询、任务详情查询、单任务重试（`force_long` + 成功后自动重置选项）
- 已强化可访问性与语义一致性：`aria-label`、`role/aria-live`、表头 `th scope="col"`、`prefers-reduced-motion`

### B站集成 API

- `GET /api/admin/bilibili/status` - 获取集成状态
- `GET /api/admin/bilibili/videos` - 获取视频监控列表
- `POST /api/admin/bilibili/videos` - 添加视频到监控
- `POST /api/admin/bilibili/videos/{id}/toggle-poll` - 启用/禁用视频轮询
- `DELETE /api/admin/bilibili/videos/{id}` - 删除视频监控
- `POST /api/admin/bilibili/videos/{id}/sync` - 同步视频信息
- `POST /api/admin/bilibili/poll` - 手动触发评论轮询
- `GET /api/admin/bilibili/credentials` - 获取凭证列表
- `POST /api/admin/bilibili/credentials` - 创建凭证
- `POST /api/admin/bilibili/credentials/{id}/activate` - 激活凭证
- `DELETE /api/admin/bilibili/credentials/{id}` - 删除凭证

## 环境变量（重点）

### 基础运行

- `APP_ENV`（建议生产为 `production`）
- `DATABASE_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `KILL_SWITCH`

### 鉴权与签名

- `API_KEY`
- `GATEWAY_TOKEN`
- `GATEWAY_HMAC_SECRET`

### LLM

- `LLM_PROVIDER`（如 `mock` / `openai_compatible`）
- `LLM_MODEL`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_FALLBACK_TO_MOCK`（生产建议 `false`）

### 发布模式

**Publisher 选择优先级**（从高到低）：

1. **Native Bilibili 发布**（当 `BILIBILI_ENABLED=true` 且 `BILIBILI_PUBLISH_ENABLED=true` 时）
   - 此配置优先级最高，会覆盖 `PUBLISHER_MODE` 设置
   - 适用于直接集成 B 站官方 API 的场景

2. **PUBLISHER_MODE 配置**（`manual_queue` / `simulated` / `webhook` / `real_publish`）
   - 当 native Bilibili 未启用时生效
   - `manual_queue`：人工审核队列（默认）
   - `simulated`：模拟发布（测试用）
   - `webhook`：通过 webhook 调用外部发布服务
   - `real_publish`：调用真实发布端点

3. **ManualQueuePublisher 回退**（当 `PUBLISHER_MODE` 配置值不被识别时）

**配置冲突警告**：当同时启用 native Bilibili 发布和 `webhook`/`real_publish` 模式时，启动时会记录警告日志，native Bilibili 将实际生效。

**相关配置**：
- `PUBLISHER_MODE`（默认 `manual_queue`）
- `PUBLISHER_TIMEOUT_SECONDS`
- `PUBLISHER_HMAC_SECRET`
- `PUBLISHER_WEBHOOK_URL` / `PUBLISHER_WEBHOOK_TOKEN`
- `PUBLISHER_REAL_PUBLISH_URL` / `PUBLISHER_REAL_PUBLISH_TOKEN`

### B站集成

- `BILIBILI_ENABLED`（是否启用B站集成，默认 `false`）
- `BILIBILI_POLL_ENABLED`（是否启用评论轮询，默认 `false`）
- `BILIBILI_PUBLISH_ENABLED`（是否启用真实发布，默认 `false`）
  - **注意**：当设置为 `true` 且 `BILIBILI_ENABLED=true` 时，将覆盖 `PUBLISHER_MODE` 设置
- `BILIBILI_POLL_INTERVAL_SECONDS`（轮询间隔秒数，默认 `300`）
- `BILIBILI_RATE_LIMIT_PER_MINUTE`（API 请求频率限制，默认 `30`）
- `BILIBILI_CREDENTIAL_ID`（使用的凭证 ID，默认 `1`）
- `BILIBILI_COOKIE_ENCRYPTION_KEY`（凭证加密密钥，32字节以上字符串）

### 生产最小配置（必填）

当 `APP_ENV=production` 时，以下校验会在启动前触发（与 `app/settings.py` 一致）：

- 基础连接必须非空：`DATABASE_URL`、`CELERY_BROKER_URL`、`CELERY_RESULT_BACKEND`
- 鉴权密钥必须非空且不能使用占位符值（如 `__SET_XXX__`）：
  - `API_KEY`
  - `GATEWAY_TOKEN`
  - `GATEWAY_HMAC_SECRET`
- 当 `LLM_PROVIDER` 为 `openai` / `openai_compatible` 时：`LLM_API_KEY` 必填
- 当 `PUBLISHER_MODE=webhook` 时：`PUBLISHER_WEBHOOK_URL`、`PUBLISHER_WEBHOOK_TOKEN`、`PUBLISHER_HMAC_SECRET` 必填
- 当 `PUBLISHER_MODE=real_publish` 时：`PUBLISHER_REAL_PUBLISH_URL`、`PUBLISHER_REAL_PUBLISH_TOKEN`、`PUBLISHER_HMAC_SECRET` 必填

生产 `.env` 最小示例（请替换为真实值）：

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg://pet_user:<db_password>@postgres:5432/bili_pet
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

API_KEY=<strong-random-api-key>
GATEWAY_TOKEN=<strong-random-gateway-token>
GATEWAY_HMAC_SECRET=<strong-random-gateway-hmac-secret>

LLM_PROVIDER=openai_compatible
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=<llm-api-key>
LLM_FALLBACK_TO_MOCK=false

PUBLISHER_MODE=manual_queue
PUBLISHER_TIMEOUT_SECONDS=15
PUBLISHER_HMAC_SECRET=<publisher-hmac-secret>
```

## 生产建议

- 先 `manual_queue` 灰度，再切 `real_publish`
- 外部执行端异常时优先切回 `manual_queue`（保持服务可用）
- 发现异常优先：`KILL_SWITCH=true` 或切回 `manual_queue`
- 生产务必关闭 mock 回退：`LLM_FALLBACK_TO_MOCK=false`

### 生产演练：故障切换与回滚（建议每次发布前执行）

1. **上线前核对**
   - 确认 `.env` 满足“生产最小配置（必填）”
   - 运行 `pytest app/tests -q`，确保回归通过
2. **灰度阶段**
   - 以 `PUBLISHER_MODE=manual_queue` 启动
   - 观察 `/health`、`/api/jobs`、`/gateway/publish-logs` 是否正常
3. **切换到自动发布**
   - 调整为 `PUBLISHER_MODE=real_publish`（或 `webhook`）并重启服务
   - 确认发布成功率与审计日志稳定
4. **故障切换（Failover）**
   - 外部发布端异常时，立即切回 `PUBLISHER_MODE=manual_queue` 并重启
   - 必要时设置 `KILL_SWITCH=true` 暂停自动处理
5. **回滚（Rollback）**
   - 回退到上一版镜像与上一版 `.env`
   - 重启后再次检查 `/health` 与关键业务接口

## CI 状态

仓库已配置工作流：

- `.github/workflows/cloud-validate.yml`
- `.github/workflows/build-and-push-ghcr.yml`

执行内容：

1. `cloud-validate`：安装依赖、`pytest app/tests -q`、`npm --prefix frontend ci`、`npm --prefix frontend run build`、`docker build`
2. `build-and-push-ghcr`：构建并推送镜像到 `ghcr.io/<owner>/<repo>`（标签：`latest`、`sha-<commit>`）

## 常见问题

### 1) `pytest: command not found`（CI）

已在工作流中通过 `python -m pip install pytest` + `python -m pytest` 规避。

### 2) 本地 `docker compose` 无法连接 Engine

通常是 Docker Desktop 未启动或引擎未就绪。先确认 Docker 正常运行再执行 compose。

### 3) 管理页静态资源 404

优先检查：

- `app/static/admin/admin.css` 与 `app/static/admin/admin.js` 是否存在
- 访问路径是否为 `/static/admin/admin.css`、`/static/admin/admin.js`
- `/admin` 页面源码中两条静态资源引用是否各 1 次

### 4) 发布 401 / 签名失败

优先检查：

- `GATEWAY_TOKEN`
- `GATEWAY_HMAC_SECRET`
- 调用端 `Authorization` / `X-Signature` 是否匹配

## License

如需开源许可，可按你的发布策略补充（MIT/Apache-2.0/专有）。
