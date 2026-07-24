# Changelog

本文件记录 bilibili-electronic-pet 的版本变更。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.3.0] - 2026-07-24

minor 版本：v1.2.4 之后 30 个提交的集中交付。D1–D5 深度研究 feat 线（eval 框架、发布可见性自检、合规模式、memory/persona/intent/llm 能力演进）落地，同时收口 odyssey reliability/security/observability high+medium 审计修复与一批 CI/infra 稳定性修复。无 breaking change（合规模式默认 off，所有新能力 opt-in，byte-for-byte backward-compat）。

### Added

- **eval: promptfoo eval 框架与 CI 回归门** (`9c366e2`, TASK-001 D6)
  - 引入 promptfoo 作为 LLM 回归门，CI 跑 persona baseline 回归；后续 `b6bd4b7` 把凭据从 placeholder 改为 `secrets.LLM_*`，`continue-on-error` 保留（MVP 非阻塞，secrets 未设不阻断 CI；预发布/prod 跑真实 Doro persona baseline）。
- **publish: native 发布评论可见性自检闭环** (`53e526d`, TASK-002 D1)
  - `bilibili-client.ts` 新增 `verifyReplyVisible`（sender_cookie + seek_rpid 双视角探针）；`publisher.ts` postReply 成功后插探针，shadowbanned → `applyBackoff(600s)` + `recordAntiriskSignal`，probe_failed fail-open 不触 backoff（C-004）；`readiness.ts` 新增 `reply_visibility_verified` gate（shadowbanned 计数>0 fail-closed）；零 migration 复用 PublishLog status 列承载 visibility_status（C-002/ZM-001）。后续 `6e0efc8`（WARN-1）补分页扫描（镜像 poller MAX_PAGES=5）避免高评论量视频单页误判 shadowbanned。
- **compliance: ISS-001 纯 webhook 被动响应合规模式** (`3e0132d`, TASK-003 G3)
  - 新增 `COMPLIANCE_MODE` 单一运维开关（默认 off 保 byte-for-byte backward compat），一键切纯 webhook 被动响应模式降法律风险（bilibili-api 侵权告知函 + 主动骚扰红线）。`compliance-mode.ts` 单一 accessor `isCompliancePassive()` 在 publisher / probe-scheduler / comment-ingest / readiness 四挂载点共享（ISS-001）；passive 下强制 webhook 非 publishReal、跳过主动探活、强制 `isPassiveResponseEligible` 硬约束（即使 `PASSIVE_RESPONSE_GATE_ENABLED=false` 合规红线优先于 L8 rollback）；readiness 加 `passive_mode_active` informational gate（非 blocker）。16 新测试，vitest 745 passed。
- **memory: D3 会话记忆接入 generator buildMessages** (`0300137`, TASK-004 G4)
  - `memory-service` 新增 `recall(spaceId)`：全量召回按 confidence DESC + updated_at DESC 排序，top-`MEMORY_RECALL_LIMIT` 截断（C-003），复用 spaceId 索引不改 schema（C-009 零 migration）；`GenerateReplyService` 加 optional `memory_context`（不传 byte-for-byte 不变）；comment-event.task recall step 注入，DB 故障 fail-open 不静默吞。13 新测试，vitest 761 passed。
- **persona: D4 三层角色 CoreTraits/SpeakingStyle/DynamicState** (`1105987`, TASK-005 G5)
  - `RoleCard` 单层扩三层：CoreTraits（Big Five + Vaillant 0-1 分数）/ SpeakingStyle（tone/formality/emoji_usage/sentence_length hints）/ DynamicState（mood/energy/relationship，复用 PetState 跨 turn 持久化派生）。三层 JSON 内嵌到 RoleCard 现有 tone 字段（C-007 零 migration），缺失层返回 `{}` 不追加 prompt 片段（byte-for-byte 单层 backward-compat）。23 新测试，vitest 784 passed。
- **eval: D5 三一致性度量 Prompt-to-Line/Line-to-Line/Q&A** (`d6b8193`, TASK-006 G6)
  - 新增三一致性度量（prompt 到生成行、生成行间、Q&A），为 LLM-as-judge 升级做基线。
- **intent: D2 LLM-led 意图代理 ReplyIntent + LLM_REVIEW_GATE** (`d691b46`, TASK-007 G7)
  - 替代 `shouldSkipByKeywords` 硬规则概率决策（嫁接点 generator.ts 非时间门 decider.ts）：`ReplyIntent`（soothe/meme/verify/reject/skip）+ `LLM_REVIEW_GATE_ENABLED` flag（默认 false backward-compat）；`intent-agent.ts` `classifyReplyIntent` 调 callLLM 判意图 + `shouldSkipByRuleAndIntent` 合成（C-005 规则优先：规则 skip 必跳 LLM 无权覆盖，规则回+LLM skip/reject 跳，规则回+LLM 回性不跳）；fail-open。`safety.ts` 加 LLM 审阅 sibling（非 replacement，规则 blocked 优先）。27 新测试，vitest 833 passed。
- **eval: D5 一致性度量 LLM-as-judge 升级** (`e86026b`, TASK-M3-001 G1)
  - M2 keyword overlap（Jaccard）升级加 LLM-as-judge 路径判语义一致性：`llmJudgeConsistency` async 调 callLLM 返 `ConsistencyMetric`；`LLM_JUDGE_ENABLED` flag（默认 false 三度量 byte-for-byte）；fail-open（LLM 失败/解析失败返 score 0 不崩）。三度量保 sync 不动，llmJudgeConsistency 独立 sibling 非替换。17→41 测试，vitest 856 passed。
- **persona: D4 style RAG 纯 TS BM25 检索** (`f0bbfa8`, TASK-M3-002 G2)
  - SpeakingStyle 从 JSON hints 全量塞 prompt 升级为纯 TS BM25/TF-IDF 检索 top-K 相关 hints（非 chromadb Docker 反模式，语料规模小无外部索引服务）。`style-rag.ts` 新增 `bm25Score`（Okapi k1=1.5 b=0.75）/ `tfidfScore`（Robertson IDF 长度归一化）/ `retrieveTopKStyleHints`；`renderThreeLayerPersonaSegment` 加 optional `query`，有 query+style_hints 时检索 top-K 渲染，否则 byte-for-byte 单条。40 新测试，vitest 896 passed。
- **memory: G4 Memory 可信度阈值过滤召回** (`860bb26`, TASK-M3-004)
  - 应用层零 migration 召回质量升级：`resolveConfidenceThreshold` 读 `MEMORY_CONFIDENCE_THRESHOLD`（默认 0 byte-for-byte 全量召回），threshold>0 时 sort 前过滤低 confidence 记忆再 sort+slice top-K；无高可信记忆返空 fail-open。10 新测试，vitest 906 passed。
- **llm: D2 callLLM tool-call 主路径 optional tools** (`f74b331`, TASK-M3-003 G3)
  - `LLMConfig` 加 `tools?`/`toolChoice?` optional（LLMTool/LLMToolChoice/LLMToolCall types）；callLLM 仅当 config.tools 存在时 body 加 tools/tool_choice（OpenAI function format / Claude input_schema format）；`parseLLMResponse` 扩 tool_use 分支（非替换 text 路径）；无 tools 参数 byte-for-byte（toolCalls undefined）。不加全局 flag（optional param 已足够 opt-in）。22 新测，vitest 928 passed。

### Changed

- **refactor(publisher): stage gate env 桥改 DI stageReady resolver** (`4f4c734`, ISS-20260710-001)
  - 消除 publisher 直接读 `STAGE_REAL_PUBLISH_READY` env 的跨层隐式耦合：publisher.ts 加 `stageReadyResolver` 注入点 + 默认 fail-closed（进程重启自动归零消除忘清零风险）；worker-main.ts 启动注入 `() => STAGE_REAL_PUBLISH_READY===true && threeLayerFlagsAllOn()`（env ACK + 实时三层 flag 联动双保险，运营忘清零 env 时 flag 翻红仍阻断）；publisher 保留 drop_count=0 硬屏障（SC4 未动）。公共 API `publishIntentWithResult` 签名不变。
- **chore(ci): node 20→22 消除 node:sqlite drift** (`142d6d3`)
  - `test/setup-memory-db.ts` 用 node:sqlite `DatabaseSync`（Node 22+ stable，Node 20 需 `--experimental-sqlite`）。升级 `engines>=22` + 5 CI workflow node-version 20→22 + 3 Dockerfile（8 stage）`node:20-alpine`→`node:22-alpine`。根因：GitHub Actions billing 失败致 ISS-004 修复从未被 CI 验证，billing 修复 + Node 22 后 CI 方能真正覆盖。
- **ci(cloud-validate): 移除 strict smoke step，strict 留预发布环境** (`9ceb936`, `961ccfd`)
  - strict_product check 要求 product_ready（含 auth_probe gate），CI 占位 bilibili 凭据无法探活真实 auth probe 必然 false。此张力自 `61545f9` 加 auth_probe productBlocker 起存在，被 billing 失败长期遮蔽。strict smoke 移到 `build-and-push-ghcr` pre-release-smoke job（甲骨文 `PRE_RELEASE_SMOKE_BASE_URL` + 真实 native 凭据，auth_probe 可探活），CI 保留 preflight（构建+foundation+delivery 契约），e2e strict 改 preflight `--strict` 对齐。
- **ci(promptfoo): CI LLM 凭据改用 secrets.LLM_\*** (`b6bd4b7`, TASK-001 收尾)
  - promptfoo eval step 从 placeholder creds 改为 `secrets.LLM_PROVIDER/LLM_API_KEY/LLM_BASE_URL`。
- **fix(deploy): api 端口绑 127.0.0.1 避免公网直曝** (`3676c4c`)
  - `deploy.yml` api ports 从 `18000:3000`（绑所有接口）改 `127.0.0.1:18000:3000`（仅 localhost），api 只经 OpenResty 反代公网可达。

### Fixed

- **fix(ci): strict staging smoke 补 CREDENTIAL_ENCRYPTION_KEY 漏配** (`1f62931`, `9b177b6`)
  - cloud-validate strict staging smoke step env 漏设 `CREDENTIAL_ENCRYPTION_KEY`，backend boot guard `isEncryptionAvailable()` fail-closed 致进程 1s 内 `exit(1)`。补 `ci-placeholder-encryption-key`，但该值非 hex 致 `Buffer.from` 解析后长度≠32 返回 null boot guard 仍 exit(1)；改用 `SHA-256(placeholder)` 确定性 64-hex（32 字节 AES key）满足 `credential-crypto.ts:22` `buf.length===32` 校验。credential-crypto fail-closed 是账号安全设计不可改宽松。
- **fix(smoke): staging-check 对齐 readiness route 去顶层 ready 的契约漂移** (`3e5c93d`, `3db2929`)
  - `readiness.ts` 已移除顶层 `ready`（foundation_ready/product_ready 两套语义并存致误读）改显式三态，`staging-check.mjs` 仍断言旧 `readinessPayload.ready===true` 致 CI strict smoke FAIL。断言改 `foundation_ready===true`（对齐旧 ready=foundationReady 语义，strict smoke 校验 backend 启动+foundation 健康不要求 product_ready 全 gate 绿）；测试同步去除 `ready` 期望。非放宽。
- **fix(probe): BILIBILI_ENABLED=false 时 auth probe 跳过探活不阻断 readiness** (`1c5643e`)
  - webhook-only 预发布环境（`BILIBILI_ENABLED=false` 不采集 bilibili）不依赖账号存活，`probeBilibiliAuthScheduler` 开头 gate：非 enabled 直接 `setAuthProbeUnhealthy(false)` + return，probe 不跑探活 readiness auth_probe_healthy gate 保持绿。此前 probe 无条件跑凭据缺失即标红 → strict smoke fail。`BILIBILI_ENABLED=true` 时账号存活仍是采集前置 probe 照常探活。709/709 绿。
- **fix(docker): healthcheck 用 node 探活替代 curl** (`de8c8e5`)
  - worker 容器 healthcheck 原用 `curl -f localhost:3100/healthz`，但 `node:*-alpine` 镜像无 curl → worker 永远 unhealthy。改用 `node -e require('http').get(...)`（镜像自带 node 零外部依赖），api 探 3000/health worker 探 3100/healthz；Dockerfile 删除写死 HEALTHCHECK（单镜像服务 api+worker 两角色，应 compose 按 role 分别定义避免 worker 继承 api 探测）。
- **fix(deps): 同步 package-lock.json 补 promptfoo 依赖树** (`785b8a2`, TASK-001 遗漏)
  - `9c366e2` 加 promptfoo devDep 未同步 lock 致生产 docker build `npm ci` 失败（lock 与 package.json 不同步）。`npm install --package-lock-only` 重生成。
- **fix(odyssey): high tier — H1/H2/H4/H5/H6/H7/H8/H9 修复** (`6f29d8b`)
  - H1 perf：bilibili-poller 逐条 `prisma.comment.create` 改批量 findMany 预查重 + createMany（libsql adapter 不支持 skipDuplicates 故预过滤）。
  - H2 perf：publisher shadowbanned 路径 `applyBackoff` + `recordAntiriskSignal` 串行改 `Promise.all` 并行（守 LD-04 同步持久化，省 1 round-trip）。
  - H4 arch：main.ts `new Redis` + 越层委派到 `lib/redis.ts` checkRedisConnection + `lib/prisma.ts` checkDatabaseConnection。
  - H5 reliability：publisher double-publish cluster — F1 `safeCreatePublishLog` catch P2002 as duplicate-success（unique index 兜 TOCTOU）；F2 task-queue BullMQ `lockDuration` 30s→120s + `maxStalledCount=2` + `stalledInterval=60s`；F5 bare swallow 加 `recordObservabilityEvent(publish_log_record_failed)`。
  - H6-H9 observability：readiness-red-without-event 反模式各站点加 fire-and-forget `recordObservabilityEvent`（probe_scheduler_failed/no_credential、circuit_breaker_open、publish_blocked_by_backoff/stage_gate）。
  - eslint baseline 3 problems 清（unused import + 2 处冗余 eslint-disable）。928/928 passed，eslint 0 error，prettier clean。
- **fix(odyssey): medium 独立项 — security timing-safe + LLM 4xx/jitter** (`7bacd03`)
  - security medium（4 处 auth timing-safe）：新增 `lib/timing-safe-compare.ts` `timingSafeStringCompare`（Buffer 等长 timingSafeEqual）；main.ts `checkApiKey`（x-api-key）+ `checkCommentIngressAuth`（token/Bearer）+ gateway-publish.ts 改 timing-safe，两路 token/bearer 都算再 OR 避短路泄露。
  - reliability medium：llm-client `callLLMWithRetry` 4xx（400/401/403/404 不可恢复）不重试，仅 5xx/网络/超时重试。
  - reliability low：LLM retry 加 full jitter `[0, baseDelay)` 防 Thundering Herd。928/928 passed。
- **fix(odyssey): reliability — poller retry exhausted 加 ObservabilityEvent** (`b73f299`)
  - bilibili-poller `fetchCommentsPage` retry exhausted 原仅 `console.error` 静默丢该页评论，加 fire-and-forget `recordObservabilityEvent(poll_retry_exhausted)` 使 poll 失败可追溯。928/928 passed。
- **fix(observability,security): S_DISCOVER 泛化命中修复 — readiness gate 4 处 + admin login timing-safe** (`ab7d939`)
  - G1 observability：main.ts 4 处 readiness-gate DB 查询 catch（backoff_active_rate / passive_response_violation / behavior_anomaly_count / reply_visibility_count）翻红 fail-closed 但仅 `console.warn` 无 ObservabilityEvent（readiness-red-without-event 反模式 H9 pattern）。补 fire-and-forget `recordObservabilityEvent(readiness_gate_error)`，非阻塞不影响 fail-closed 返回值。SC4 硬门（behavior_anomaly_count）是最严重遗漏。
  - G2 security：admin-core.ts `/api/admin/session/login` 端点 `!==` 直接比对 request body api_key 与 settings.apiKey（admin 主密钥，独立 timing-attack 入口不经 checkApiKey），改 `timingSafeStringCompare` 与 main.ts / gateway-publish.ts 一致（P2 pattern）。G3 poller fire-and-forget safe。G4 admin @unique create 无 P2002 → ISS-20260723-002。
- **fix(reliability): ISS-002 admin @unique create 加 P2002 catch → 409 conflict** (`1db88dc`)
  - `ab7d939` G4 发现的 admin `@unique` 约束 create 无 P2002 catch 落地修复：admin 创建路径加 P2002 catch 返 409 conflict（与 H5 F1 publisher duplicate-success 同 TOCTOU 兜底 pattern）。

### Internal

- 知识沉淀：v1.2.4 之后 30 个提交按 Added/Changed/Fixed 三段集中登记；odyssey reliability/security/observability audit（H1-H9 + medium + S_DISCOVER + ISS-002）作为单一 minor 版本的稳定性收口，与 D1-D5 feat 线交织记录而非拆 patch 版本。

---

## [1.2.4] - 2026-07-16

### Fixed

- **test: per-worker SQLite 文件隔离消除 worker-integration flake** (`fc1069d`, ISS-20260710-004)
  - vitest forks pool 多 worker 并发复用模块级 prismaSingleton 写同一 `file:./dev.db` 致 `worker-integration.test.ts` ~40% flake 失败。并发写抛 `PrismaClientKnownRequestError`（写锁），不被 `isPublishLogStorageError` 认（仅认 schema 错误）→ `publishIntentWithResult` findFirst rethrow → outer catch → `published=false` → 断言失败。
  - 修复：`test/setup-memory-db.ts`（setupFiles）用 `VITEST_WORKER_ID` 命名 per-worker 临时 SQLite 文件，`node:sqlite` `DatabaseSync` 同步执行 `prisma/migrations` SQL 建 schema，设 `DATABASE_URL` 指向该文件，`globalThis` once-guard 避免同 worker 多文件重复建。**关键陷阱**：setup 绝不 import `src/lib/prisma.ts`（会在 mock 单元测试的 `vi.mock` 生效前实例化真实 adapter，破坏调用计数断言）。
  - `src/lib/prisma.ts` 与 `isPublishLogStorageError` 零改动（Fix-Don't-Hide：真实 DB 故障 MUST 上浮 readiness 信号）。
- **ui: 12 个管理后台内联 SVG 补 a11y 属性** (`981a5f6`, ISS-20260712-002)
  - `frontend/src/pages/` 下 8 个页面文件的 12 处内联 `<svg>` 补 `aria-hidden="true" focusable="false"`，闭环 ISS-20260712-002，避免屏幕阅读器误读装饰性图标。

### Changed

- **refactor(backoff): backoffMap 模块单例封装为 BackoffStateContainer** (`6bf6557`, MAINT-006)
  - `backend-ts/src/services/backoff-decision.ts` 的模块级裸 `Map<string, BackoffState>` 封装为 `BackoffStateContainer` 类 + `createBackoffStateContainer` 工厂。公共 API（`isPersonaInBackoff` / `applyBackoff` / `rebuildBackoffFromDb`）签名与行为不变，模块仍持有单例 `backoffState`。状态访问统一经容器方法，`__resetBackoffMapForTest` 等测试钩子保留。
  - 纯可维护性重构，非阻塞，无行为变更。全量测试 708/708 绿。

### Internal

- 知识沉淀：ISS-004 flake 修复方案固化为 debug spec `S-20260715-1ubo`；MAINT-006 动机核查（vitest forks pool 模块单例跨文件污染为假想债）固化为 `S-20260715-wrhv`。
- codebase 文档 full rebuild（`--force`）：tech-stack / architecture / features / concerns 四维文档 + doc-index.json（42 components / 5 features）覆盖性重建。

---

## [1.2.3] - 2026-07-13

### Fixed

- review-odyssey-006 收尾：gateway.js render fn F6 同族 null-safe 修复 (`0e95e51`)。

---

## [1.2.2] - 2026-07-12

### Fixed

- review-odyssey-006：errno regex 衡全 + renderTable 自动 title + null-safe + tuple reason 一致性 (`2b52eb4`)。
- review-odyssey-006 confirm rework：NF1 table.js object 值跳过 title + NF2 补 EAI/ENETRESET errno (`d34a62c`)。
- ui: cell-id/cell-truncate 补 title 供 hover 查看完整值 (UI-odyssey 001 sibling) (`8c4d834`)。
- ui: 管理后台 a11y/交互态/响应式/主题修复 (UI-odyssey 001) (`a1fe69c`)。

---

## [1.2.1] - 2026-07-12

### Fixed

- docs: 修复 normalizeFailureReason errno 族注释笔误 (`175744d`)。
- publishWebhook HTTP 非 2xx 路径走 normalize 收敛 + normalizeFailureReason regex 补全 errno 族 (`f74e00a`)。
- publishWebhook 失败 reason 走 normalize 收敛, observability 改两语句守护形式 (`e421b7d`)。
- observability buffer/threshold 与 publisher webhook timeout 补 env 守护 (`b7bf9dc`)。

---

## [1.2.0] - 2026-07-11

### Added

- feat: A 层 BackoffDecision per-persona 退避 cap 600s/60s + DB 重建 + backoff_applied event (`de02ee9`, TASK-004)。
- feat: C 层被动响应 gate 入队前 @自己/关键词过滤 + `PASSIVE_RESPONSE_GATE_ENABLED` (`37e0443`, TASK-003)。
- feat: C 层 per-persona token bucket 速率上限 + reject 区分 + 法律红线 ESLint enforce (`5e15b46`, TASK-006)。
- feat: readiness gate 扩展 three_layer_flags_all_on + behavior_anomaly_count_zero (`733e5ce`, TASK-003)。
- feat: 扩展 PUBLISHER_MODE 加 dry_run + stage 门禁 + STAGE_DAILY_QUOTA 配额 + ramp-up env (`3f99343`, TASK-001)。
- feat: simulated mock -352 注入 postReply config 参数扩展 runtime 注入 fake PostReplyResult (`0698d22`, TASK-002)。
- feat: probeBilibiliAuth 周期调度 14 天存活断言 + readiness auth_probe 标红 (`61545f9`, TASK-005)。
- feat: 离线 replay harness jitterSeed 确定性重放 + CSV + 间隔/昼夜分布断言 (`6c6337d`, TASK-004)。
- feat: eval harness mock -352 端到端 + admin-reporting antirisk groupBy + readiness gate 扩展 (`ac3a7f6`, TASK-007)。
- feat: ISS-005 postReply 暴露 error_code + publisher dispatch platform (`c26a735`, TASK-001)。

### Fixed

- fix: 修复自动发现的 14 个后端 bug (`9a71339`)。
- fix: 修复 quality-review 6 项代码层缺陷 (`a4111d1`)。
- fix: review-odyssey 修复 5 项 fix-不完整缺陷 (`ec666f1`)。
- fix: 守护可选服务 env 数值配置防 NaN 污染 (`d66d521`)。
- fix: env 数值守护补上界防越界大值与 Claude temperature 非法值 (`34e9737`)。

---

## [1.1.0] - 2026-07-10

### Added

- persona 数据源复用 BilibiliCredential.name 接入 recordAntiriskSignal + comment-ingest (`aa97d6a`, TASK-002)。

### Fixed

- 补全 routes-services-coverage-gap TIMING_ENGINE_ENABLED 走 legacy 路径 (`da8b96c`, TASK-005 收尾)。

---

[1.3.0]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.3.0
[1.2.4]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.4
[1.2.3]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.3
[1.2.2]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.2
[1.2.1]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.1
[1.2.0]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.0
[1.1.0]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.1.0
