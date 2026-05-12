import './styles.css';

const sections = [
  {
    eyebrow: 'Product',
    title: 'Bilibili-first electronic pet operations',
    body:
      '把评论采集、风险判断、回复生成、人工审核、发布网关和审计追踪串成一条可运营的链路。',
    links: [
      ['功能总览', '#features'],
      ['部署指南', '#deploy'],
      ['运维检查', '#ops']
    ]
  },
  {
    eyebrow: 'Architecture',
    title: 'TypeScript backend with Vite admin surfaces',
    body:
      '当前正式基线由 Fastify、Prisma、BullMQ、Redis、SQLite / libSQL 和原生 Vite 管理后台组成。',
    links: [
      ['系统架构', '#architecture'],
      ['数据流', '#flow'],
      ['版本状态', '#roadmap']
    ]
  }
];

const features = [
  ['评论处理链路', '接收评论事件、去重冷却、安全检查、生成回复，并进入审核或发布流程。'],
  ['B 站集成', '管理账号凭证、监控视频、定时轮询评论，并支持真实 B 站发布开关。'],
  ['管理后台', '覆盖仪表盘、任务、知识库、Memory、角色卡、网关日志、审计日志和诊断视图。'],
  ['Companion', '通过 backend 托管 `/companion` 静态页面，并提供 `/companion/state-v2` 状态接口。'],
  ['多平台试点', 'Douyin 和 QQ 保留试点链路，Bilibili 是当前正式支持平台。'],
  ['交付门禁', 'readiness、strict smoke、expanded-scope preflight 和三端构建共同支撑发布质量。']
];

const stack = [
  ['Backend', 'Node.js 20 · TypeScript 5 · Fastify 5 · Prisma 7 · Vitest'],
  ['Frontend', 'Vite 5 · 原生 ES Module · 原生 CSS · 无框架依赖'],
  ['Infra', 'Docker · Docker Compose · Redis 7 · SQLite / libSQL'],
  ['Workers', 'BullMQ · ioredis · comment-event queue · polling jobs']
];

const deploySteps = [
  ['准备配置', '复制 `.env.example`，按目标环境配置 B 站凭证、Redis、数据库与发布网关开关。'],
  ['启动编排', '使用根目录 Docker Compose 启动 migrate、API、Worker 与 Redis。'],
  ['验证健康', '检查 `/health`、`/readiness` 和管理后台诊断视图，确认 foundation / delivery 门禁。'],
  ['发布文档', '推送 `docs-site/**` 或手动触发 `docs-pages` workflow，GitHub Pages 会部署 `docs-site/dist`。']
];

const ops = [
  '确认 Bilibili credential 状态和监控视频列表。',
  '检查 comment-event 队列积压、worker 日志和 Redis 连接。',
  '通过审计日志追踪发布、审批、重试和导出操作。',
  '使用 readiness 诊断定位 foundation_ready / delivery_ready blocker。',
  '发布前运行 backend、frontend、pet-companion-web 的测试与构建。'
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

function app() {
  return `
    <header class="site-header">
      <a class="brand" href="#top" aria-label="Bilibili 电子宠物文档首页">
        <span class="brand-mark">B</span>
        <span>Bilibili 电子宠物</span>
      </a>
      <nav aria-label="主导航">
        <a href="#features">功能</a>
        <a href="#architecture">架构</a>
        <a href="#deploy">部署</a>
        <a href="#ops">运维</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Documentation · v1.2.0 baseline</p>
          <h1>面向 B 站评论区自动回复系统的产品、架构、部署与运维指南。</h1>
          <p class="hero-text">
            这个文档站汇总当前正式基线：Bilibili 主平台链路、TypeScript 后端、Vite 管理后台、companion 页面和交付门禁。
          </p>
          <div class="hero-actions">
            <a class="primary" href="#quick-start">快速开始</a>
            <a class="secondary" href="https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.0">查看 Release</a>
          </div>
        </div>
        <div class="hero-grid">${heroPanels(sections)}</div>
      </section>

      <section id="quick-start" class="section split">
        <div>
          <p class="eyebrow">Quick start</p>
          <h2>从本地运行到发布验证</h2>
        </div>
        <div class="command-stack" aria-label="常用命令">
          <code>docker compose up --build</code>
          <code>npm --prefix backend-ts test</code>
          <code>npm --prefix frontend run build</code>
          <code>npm --prefix pet-companion-web run build</code>
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
          <h2>运行时组件</h2>
          <p>后端 API、worker、队列、数据库与前端页面共同构成当前交付基线。</p>
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
      </section>

      <section id="flow" class="section split flow">
        <div>
          <p class="eyebrow">Flow</p>
          <h2>评论处理主链路</h2>
        </div>
        <ol>
          <li>采集 B 站评论并写入内部事件。</li>
          <li>执行去重、冷却、安全判断和上下文检索。</li>
          <li>生成回复草稿，按策略进入人工审核或自动发布。</li>
          <li>记录发布日志、审计事件和每日指标。</li>
        </ol>
      </section>

      <section id="deploy" class="section">
        <div class="section-heading">
          <p class="eyebrow">Deploy</p>
          <h2>部署路径</h2>
          <p>应用部署和文档站部署分离：业务服务走 Docker Compose，文档站走 GitHub Pages workflow。</p>
        </div>
        <ol class="steps">${stepList(deploySteps)}</ol>
      </section>

      <section id="ops" class="section ops">
        <div class="section-heading">
          <p class="eyebrow">Operations</p>
          <h2>上线与值守检查清单</h2>
        </div>
        <ul>${ops.map((item) => `<li>${item}</li>`).join('')}</ul>
      </section>

      <section id="roadmap" class="section roadmap">
        <div>
          <p class="eyebrow">Roadmap</p>
          <h2>当前范围</h2>
          <p>Bilibili 是正式支持平台；QQ 和 Douyin 仍按试点链路推进；Kuaishou 保留脚手架；微信暂不支持。</p>
        </div>
        <div class="status-table">
          <div><span>Bilibili</span><strong>正式支持</strong></div>
          <div><span>QQ</span><strong>试点支持</strong></div>
          <div><span>Douyin</span><strong>试点能力</strong></div>
          <div><span>Kuaishou</span><strong>预留脚手架</strong></div>
        </div>
      </section>
    </main>

    <footer>
      <p>Bilibili 电子宠物文档站 · Generated from repository baseline v1.2.0</p>
    </footer>
  `;
}

document.querySelector('#app').innerHTML = app();
