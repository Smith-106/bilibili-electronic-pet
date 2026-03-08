# Bilibili 电子宠物

一个面向评论区自动回复的服务端项目，包含：评论事件接入、风险拦截、角色卡生成、发布网关、管理后台与审计能力。

## 功能概览

- 评论事件接入（webhook / poller / official / 多平台入口）
- 自动生成回复（风格 + 长度 + 角色卡优先级）
- 安全策略（关键词、PII、人工审核队列）
- 发布网关（Bearer + HMAC 校验、幂等去重）
- 管理后台（任务列表、批量 approve/retry、趋势、审计、角色卡工作台）
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

### 4) 健康检查

```bash
curl -sS http://127.0.0.1:8000/health
```

期望：

```json
{"ok": true}
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
- 已覆盖单项诊断能力：评论详情查询、任务详情查询、单任务重试（`force_long` + 成功后自动重置选项）

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

- `PUBLISHER_MODE`（`manual_queue` / `webhook` / `real_publish` / `simulated`）
- `PUBLISHER_TIMEOUT_SECONDS`
- `PUBLISHER_HMAC_SECRET`
- `PUBLISHER_WEBHOOK_URL` / `PUBLISHER_WEBHOOK_TOKEN`
- `PUBLISHER_REAL_PUBLISH_URL` / `PUBLISHER_REAL_PUBLISH_TOKEN`

## 生产建议

- 先 `manual_queue` 灰度，再切 `real_publish`
- 发现异常优先：`KILL_SWITCH=true` 或切回 `manual_queue`
- 生产务必关闭 mock 回退：`LLM_FALLBACK_TO_MOCK=false`

## CI 状态

仓库已配置工作流：

- `.github/workflows/cloud-validate.yml`
- `.github/workflows/build-and-push-ghcr.yml`

执行内容：

1. `cloud-validate`：安装依赖、`pytest app/tests -q`、`docker build`
2. `build-and-push-ghcr`：构建并推送镜像到 `ghcr.io/<owner>/<repo>`（标签：`latest`、`sha-<commit>`）

## 常见问题

### 1) `pytest: command not found`（CI）

已在工作流中通过 `python -m pip install pytest` + `python -m pytest` 规避。

### 2) 本地 `docker compose` 无法连接 Engine

通常是 Docker Desktop 未启动或引擎未就绪。先确认 Docker 正常运行再执行 compose。

### 3) 发布 401 / 签名失败

优先检查：

- `GATEWAY_TOKEN`
- `GATEWAY_HMAC_SECRET`
- 调用端 `Authorization` / `X-Signature` 是否匹配

## License

如需开源许可，可按你的发布策略补充（MIT/Apache-2.0/专有）。
