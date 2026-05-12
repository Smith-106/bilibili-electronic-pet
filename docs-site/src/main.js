import './styles.css';

const releaseUrl = 'https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.1';
const pagesUrl = 'https://smith-106.github.io/bilibili-electronic-pet/';

const sections = [
  {
    eyebrow: 'Product',
    title: 'Bilibili-first electronic pet operations',
    body: '把评论采集、风险判断、回复生成、人工审核、发布网关和审计追踪串成一条可运营的链路。',
    links: [
      ['能力地图', '#features'],
      ['平台状态', '#platforms'],
      ['版本基线', '#baseline']
    ]
  },
  {
    eyebrow: 'Architecture',
    title: 'Runtime topology and delivery gates',
    body: '用 API、Worker、Redis、Prisma、SQLite / libSQL、Readiness 和审计日志解释系统如何工作。',
    links: [
      ['架构深读', '#architecture'],
      ['主链路', '#flow'],
      ['设计原理', '#principles']
    ]
  }
];

const readerPaths = [
  ['5 分钟了解', '我想知道项目解决什么问题。', '先读能力地图、版本基线和平台状态。', ['#features', '#baseline', '#platforms']],
  ['架构深读', '我想理解系统为什么这样设计。', '阅读组件职责、评论生命周期和设计原理。', ['#architecture', '#flow', '#principles']],
  ['部署上线', '我想把服务和文档站跑起来。', '按 runbook 准备配置、启动服务并验证 readiness。', ['#quick-start', '#deploy', '#ops']],
  ['运维排障', '我想定位运行中哪里出了问题。', '从 symptom 表开始，映射到 Redis、Worker、凭证、发布网关和试点平台。', ['#ops', '#troubleshooting', '#platforms']]
];

const baseline = [
  ['业务基线', 'v1.2.0', 'Bilibili-first 正式版，包含 QQ 试点发布链路。'],
  ['文档发布', 'v1.2.1', '新增 GitHub Pages 文档站和自动部署 workflow。'],
  ['发布方式', 'GitHub Pages', '项目站点路径固定为 /bilibili-electronic-pet/。'],
  ['范围原则', 'Docs only', '本轮只深化文档站，不修改业务运行逻辑。']
];

const features = [
  ['评论处理链路', '接收评论事件、去重冷却、安全检查、生成回复，并进入审核或发布流程。'],
  ['B 站集成', '管理账号凭证、监控视频、定时轮询评论，并支持真实 B 站发布开关。'],
  ['管理后台', '覆盖仪表盘、任务、知识库、Memory、角色卡、网关日志、审计日志和诊断视图。'],
  ['Companion', '通过 backend 托管 `/companion` 静态页面，并提供 `/companion/state-v2` 状态接口。'],
  ['多平台试点', 'Douyin 和 QQ 保留试点链路，Bilibili 是当前正式支持平台。'],
  ['交付门禁', 'readiness、strict smoke、expanded-scope preflight 和三端构建共同支撑发布质量。']
];

const responsibilities = [
  ['Admin UI', '运营入口', '任务、知识库、Memory、平台凭证、审计与诊断视图。'],
  ['Companion Web', '电子宠物体验', '展示 pet 状态，通过 backend 静态托管和 state-v2 API 接入。'],
  ['Fastify API', '同步边界', '承载管理后台 API、健康检查、readiness、发布网关和静态资源托管。'],
  ['Bilibili Poller', '采集入口', '定时轮询监控视频评论，把外部评论转成内部事件。'],
  ['BullMQ Worker', '异步执行', '消费 comment-event 队列，推进安全检查、生成、审核和发布任务。'],
  ['Redis Queue', '缓冲隔离', '隔离外部采集和内部处理，承载重试、延迟和积压观测。'],
  ['Prisma', '数据访问', '统一访问任务、日志、Memory、凭证和配置等持久化模型。'],
  ['SQLite / libSQL', '默认存储', '当前默认数据层，Docker Compose 通过共享 volume 挂载数据文件。'],
  ['Publish Gateway', '发布安全边界', '集中控制真实发布、结果记录、失败追踪和审计写入。'],
  ['Readiness', '交付门禁', '用 foundation / delivery / product 维度暴露上线阻塞项。']
];

const stack = [
  ['Backend', 'Node.js 20 · TypeScript 5 · Fastify 5 · Prisma 7 · Vitest'],
  ['Frontend', 'Vite 5 · 原生 ES Module · 原生 CSS · 无框架依赖'],
  ['Infra', 'Docker · Docker Compose · Redis 7 · SQLite / libSQL'],
  ['Workers', 'BullMQ · ioredis · comment-event queue · polling jobs']
];

const lifecycle = [
  ['Observed comment', 'Bilibili Poller 发现新评论', '保留外部来源和视频上下文。'],
  ['Deduplicated', '去重与冷却检查通过', '避免重复回复和过度触达。'],
  ['Safety checked', '安全策略允许继续处理', '阻断敏感内容或不应回复的场景。'],
  ['Draft generated', '结合 Memory / 知识 / 角色卡生成回复草稿', '回复仍未必会真实发布。'],
  ['Review or auto publish', '根据策略进入人工审核或自动发布', '人工路径是运营安全阀。'],
  ['Published / rejected / failed', '发布网关返回结果或人工拒绝', '所有结果都进入日志与审计。'],
  ['Audited', '审计事件可追踪', '用于回溯操作、排障和运营复盘。']
];

const principles = [
  ['Bilibili-first', '正式价值聚焦 B 站评论区运营闭环。', '试点平台只能作为扩展路径展示，不能混同正式支持。'],
  ['Queue isolation', '采集和处理通过 Redis / BullMQ 解耦。', '提高抗抖动能力，但需要观察队列积压和 worker 状态。'],
  ['Human-in-the-loop', '人工审核保留在回复发布前的关键路径。', '牺牲部分自动化速度，换取发布安全和可控性。'],
  ['Auditability', '发布、审批、重试和导出都应留下审计线索。', '排障时优先看日志和审计，而不是猜测 UI 状态。'],
  ['Readiness gates', 'foundation / delivery / product 分层暴露交付状态。', '上线判断以门禁为准，而不是只看进程是否存活。'],
  ['Static docs delivery', '文档站由 GitHub Pages 发布，业务服务由 Docker Compose 运行。', '两条部署链路独立验证，避免文档发布影响业务运行。']
];

const deploySteps = [
  ['准备配置', '复制 `.env.example`，按目标环境配置 B 站凭证、Redis、数据库路径、API key 和发布网关开关。'],
  ['启动业务服务', '使用根目录 Docker Compose 启动 migrate、API、Worker 与 Redis，并确认共享 SQLite volume 正常挂载。'],
  ['验证服务门禁', '检查 `/health`、`/readiness` 和管理后台诊断视图，确认 foundation / delivery / product 没有阻塞项。'],
  ['验证三端构建', '运行 backend、frontend、pet-companion-web 的测试或构建命令，确认业务基线仍可交付。'],
  ['部署文档站', '推送 `docs-site/**` 或手动触发 `docs-pages` workflow，GitHub Pages 会部署 `docs-site/dist`。']
];

const ops = [
  '确认 Bilibili credential 状态和监控视频列表。',
  '检查 comment-event 队列积压、worker 日志和 Redis 连接。',
  '通过审计日志追踪发布、审批、重试和导出操作。',
  '使用 readiness 诊断定位 foundation_ready / delivery_ready blocker。',
  '发布前运行 backend、frontend、pet-companion-web 的测试与构建。'
];

const troubleshooting = [
  ['评论没有进入任务', 'Bilibili Poller / 凭证 / 监控视频', '检查账号凭证、监控视频列表、poller 日志和平台接口响应。'],
  ['任务积压不处理', 'Redis Queue / BullMQ Worker', '检查 Redis 连接、worker 进程、队列深度和失败重试数。'],
  ['readiness 阻塞', '配置 / 数据库 / 依赖服务', '按 foundation、delivery、product blocker 分类定位缺失配置或服务不可用。'],
  ['回复未发布', 'Publish Gateway / 审核策略', '检查发布开关、人工审核状态、gateway 日志和 publish log。'],
  ['Companion 状态异常', '静态托管 / state-v2 API', '检查 `/companion` 静态资源、`/companion/state-v2` 响应和 backend 路由。'],
  ['试点平台不可用', 'Sidecar / endpoint / 环境变量', '确认 QQ / Douyin sidecar、endpoint 和 `PLATFORM_*` 配置；不要按正式能力处理。']
];

const platforms = [
  ['Bilibili', '正式支持', '评论轮询、凭证管理、视频监控、发布网关和审计链路。', '当前正式交付范围。'],
  ['QQ', '试点支持', '`qq-sidecar` + OneBot HTTP / NapCat 链路已用于本地与 CI 验证。', '仍按试点能力管理。'],
  ['Douyin / 抖音', '试点能力', '代码与本地验证已具备。', '远端 rollout 仍需 verified sidecar endpoint 与 `PLATFORM_DOUYIN_*` 配置。'],
  ['Kuaishou / 快手', '预留脚手架', '保留扩展结构。', '不作为正式交付能力。'],
  ['WeChat / 微信', '暂不支持', '不在当前路线范围。', '不要承诺接入能力。']
];

function cardList(items) {
  return items
    .map(
      ([title, body]) => `
        <article class="card">
          <h3>${title}</h3>
          <p>${body}</p>
        </article>`
    )
    .join('');
}

function readerPathList(items) {
  return items
    .map(
      ([title, question, body, links]) => `
        <article class="path-card">
          <h3>${title}</h3>
          <p class="question">${question}</p>
          <p>${body}</p>
          <div>${links.map((href) => `<a href="${href}">${href.replace('#', '')}</a>`).join('')}</div>
        </article>`
    )
    .join('');
}

function baselineList(items) {
  return items
    .map(
      ([label, value, body]) => `
        <div class="metric">
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${body}</p>
        </div>`
    )
    .join('');
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function stepList(items) {
  return items
    .map(
      ([title, body], index) => `
        <li class="step">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <div>
            <h3>${title}</h3>
            <p>${body}</p>
          </div>
        </li>`
    )
    .join('');
}

function heroPanels(items) {
  return items
    .map(
      (item) => `
        <article class="hero-panel">
          <p class="eyebrow">${item.eyebrow}</p>
          <h2>${item.title}</h2>
          <p>${item.body}</p>
          <div class="panel-links">
            ${item.links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}
          </div>
        </article>`
    )
    .join('');
}

function principleList(items) {
  return items
    .map(
      ([title, why, tradeoff]) => `
        <article class="principle-card">
          <h3>${title}</h3>
          <p>${why}</p>
          <small>${tradeoff}</small>
        </article>`
    )
    .join('');
}

function callout(type, title, body) {
  return `
    <aside class="callout ${type}">
      <strong>${title}</strong>
      <p>${body}</p>
    </aside>`;
}

function app() {
  return `
    <header class="site-header">
      <a class="brand" href="#top" aria-label="Bilibili 电子宠物文档首页">
        <span class="brand-mark">B</span>
        <span>Bilibili 电子宠物</span>
      </a>
      <nav aria-label="主导航">
        <a href="#overview">概览</a>
        <a href="#architecture">架构</a>
        <a href="#principles">原理</a>
        <a href="#deploy">部署</a>
        <a href="#ops">运维</a>
        <a href="#platforms">平台</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero" id="overview">
        <div class="hero-copy">
          <p class="eyebrow">Documentation · v1.2.1 docs release</p>
          <h1>面向 B 站评论区自动回复系统的产品、架构、部署与运维指南。</h1>
          <p class="hero-text">
            这个文档站汇总当前正式基线：Bilibili 主平台链路、TypeScript 后端、Vite 管理后台、companion 页面和交付门禁。
          </p>
          <div class="hero-actions">
            <a class="primary" href="#reader-paths">选择阅读路径</a>
            <a class="secondary" href="${releaseUrl}">查看 Release</a>
          </div>
        </div>
        <div class="hero-grid">${heroPanels(sections)}</div>
      </section>

      <section id="reader-paths" class="section">
        <div class="section-heading">
          <p class="eyebrow">Reader paths</p>
          <h2>按你的目标阅读</h2>
          <p>文档站按读者意图组织：先建立整体理解，再进入架构、部署和运维细节。</p>
        </div>
        <div class="path-grid">${readerPathList(readerPaths)}</div>
      </section>

      <section id="baseline" class="section">
        <div class="section-heading">
          <p class="eyebrow">Baseline</p>
          <h2>版本与发布基线</h2>
          <p>业务能力基线和文档站发布分开理解，避免把文档发布误认为业务能力新增。</p>
        </div>
        <div class="metrics-grid">${baselineList(baseline)}</div>
        ${callout('note', 'GitHub Pages 项目站点', `当前访问地址是 <a href="${pagesUrl}">${pagesUrl}</a>，对应仓库项目站点，而不是用户/组织根站点。`)}
      </section>

      <section id="quick-start" class="section split">
        <div>
          <p class="eyebrow">Quick start</p>
          <h2>从本地运行到发布验证</h2>
          <p>业务服务、前端构建和文档站构建是三条不同验证线，发布前应分别确认。</p>
        </div>
        <div class="command-stack" aria-label="常用命令">
          <code>docker compose up --build</code>
          <code>npm --prefix backend-ts test</code>
          <code>npm --prefix frontend run build</code>
          <code>npm --prefix pet-companion-web run build</code>
          <code>npm --prefix docs-site run build</code>
        </div>
      </section>

      <section id="features" class="section">
        <div class="section-heading">
          <p class="eyebrow">Features</p>
          <h2>系统能力地图</h2>
          <p>围绕评论运营闭环组织功能，而不是围绕单个页面或服务拆散信息。</p>
        </div>
        <div class="card-grid">${cardList(features)}</div>
      </section>

      <section id="architecture" class="section architecture">
        <div class="section-heading">
          <p class="eyebrow">Architecture</p>
          <h2>运行时组件与职责边界</h2>
          <p>后端 API、worker、队列、数据库、前端页面和 readiness 门禁共同构成当前交付基线。</p>
        </div>
        <div class="diagram" role="img" aria-label="系统架构图">
          <div>Admin UI</div>
          <div>Companion Web</div>
          <div class="wide">Fastify API · Readiness · Gateway · Audit</div>
          <div>Bilibili Poller</div>
          <div>BullMQ Worker</div>
          <div>Redis Queue</div>
          <div>Prisma</div>
          <div>SQLite / libSQL</div>
          <div>Publish Gateway</div>
        </div>
        <div class="stack-grid">${cardList(stack)}</div>
        ${table(['组件', '职责', '读者应理解的边界'], responsibilities)}
      </section>

      <section id="flow" class="section flow-deep">
        <div class="section-heading">
          <p class="eyebrow">Flow</p>
          <h2>评论处理生命周期</h2>
          <p>从外部评论到审计记录，核心路径通过队列、策略、审核和发布网关分层推进。</p>
        </div>
        <div class="timeline">
          ${lifecycle
            .map(
              ([state, trigger, note], index) => `
                <article>
                  <span>${String(index + 1).padStart(2, '0')}</span>
                  <h3>${state}</h3>
                  <p>${trigger}</p>
                  <small>${note}</small>
                </article>`
            )
            .join('')}
        </div>
      </section>

      <section id="principles" class="section">
        <div class="section-heading">
          <p class="eyebrow">Principles</p>
          <h2>关键设计原理</h2>
          <p>架构不仅说明有哪些组件，也说明为什么这些边界值得保留。</p>
        </div>
        <div class="principles-grid">${principleList(principles)}</div>
      </section>

      <section id="deploy" class="section">
        <div class="section-heading">
          <p class="eyebrow">Deploy</p>
          <h2>部署 runbook</h2>
          <p>应用部署和文档站部署分离：业务服务走 Docker Compose，文档站走 GitHub Pages workflow。</p>
        </div>
        ${callout('warning', '部署前提', '真实发布能力依赖平台凭证、发布开关和 readiness 门禁；不要只根据进程存活判断可上线。')}
        <ol class="steps">${stepList(deploySteps)}</ol>
      </section>

      <section id="ops" class="section ops">
        <div class="section-heading">
          <p class="eyebrow">Operations</p>
          <h2>上线与值守检查清单</h2>
        </div>
        <ul>${ops.map((item) => `<li>${item}</li>`).join('')}</ul>
      </section>

      <section id="troubleshooting" class="section">
        <div class="section-heading">
          <p class="eyebrow">Troubleshooting</p>
          <h2>症状到边界的排障路径</h2>
          <p>先定位边界，再看对应日志、队列、配置或审计记录，避免直接修改无关模块。</p>
        </div>
        ${table(['症状', '可能边界', '首要检查'], troubleshooting)}
      </section>

      <section id="platforms" class="section roadmap">
        <div>
          <p class="eyebrow">Platforms</p>
          <h2>平台支持状态</h2>
          <p>Bilibili 是正式支持平台；QQ 和 Douyin 仍按试点链路推进；Kuaishou 保留脚手架；微信暂不支持。</p>
          ${callout('note', '范围说明', '平台状态是交付承诺边界。试点能力可以用于验证，但不等同于正式生产 rollout。')}
        </div>
        ${table(['平台', '状态', '能力', '备注'], platforms)}
      </section>
    </main>

    <footer>
      <p>Bilibili 电子宠物文档站 · Generated from repository baseline v1.2.0 and docs release v1.2.1</p>
    </footer>
  `;
}

document.querySelector('#app').innerHTML = app();
