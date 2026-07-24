import './styles.css';

const releaseUrl = 'https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.3.0';
const pagesUrl = 'https://smith-106.github.io/bilibili-electronic-pet/';

const heroPanels = [
  {
    eyebrow: 'Product',
    title: 'Bilibili-first comment operations with a visible control plane',
    body:
      'This project turns comment intake, safety checks, draft generation, approval, publishing, and audit tracing into one operator-readable workflow.',
    links: [
      ['Feature map', '#features'],
      ['Delivery baseline', '#baseline'],
      ['Platform support', '#platforms'],
    ],
  },
  {
    eyebrow: 'Runtime',
    title: 'API, worker, readiness, and companion surfaces share one delivery baseline',
    body:
      'The backend, queue, database, admin UI, and companion UI are designed as one runtime topology instead of separate disconnected tools.',
    links: [
      ['Architecture', '#architecture'],
      ['Runtime flow', '#flow'],
      ['Release checklist', '#deploy'],
    ],
  },
];

const readerPaths = [
  [
    'Product overview',
    'I need the shortest path to understand what this repository ships today.',
    'Start with the feature map, release baseline, and platform support table before reading the deeper runtime details.',
    ['#features', '#baseline', '#platforms'],
  ],
  [
    'Runtime model',
    'I need to understand how the backend, worker, admin UI, and companion surface fit together.',
    'Read the architecture diagram, responsibility table, and comment lifecycle timeline as one connected runtime story.',
    ['#architecture', '#flow', '#principles'],
  ],
  [
    'Release and deploy',
    'I need to bring the services up and validate the current delivery baseline.',
    'Follow the deploy runbook, then check readiness gates and package builds instead of assuming the runtime is healthy.',
    ['#deploy', '#ops', '#troubleshooting'],
  ],
  [
    'Troubleshooting',
    'I need to map symptoms back to the correct subsystem quickly.',
    'Start from the troubleshooting table so you debug the correct boundary instead of guessing from a UI symptom alone.',
    ['#troubleshooting', '#ops', '#platforms'],
  ],
];

const baseline = [
  ['Shipped baseline', 'v1.3.0', 'Current Bilibili-first release baseline with the TypeScript backend and operator control plane.'],
  ['Docs release', 'v1.3.0', 'GitHub Pages documentation layer and docs deployment workflow.'],
  ['Pages path', '/bilibili-electronic-pet/', 'Project site base path used by the Vite docs build.'],
  ['Scope', 'Docs only', 'This documentation surface explains the runtime and release shape without changing business logic.'],
];

const launchStatus = [
  ['Admin UI', 'Mature', 'Operator control plane with runtime diagnostics, jobs, memory, platform, audit, and Bilibili flows.'],
  ['Companion UI', 'Runtime integrated', 'Backend-served companion surface exists, but the full electronic-pet product loop remains partial.'],
  ['Docs UI', 'This page', 'Project-facing documentation surface for release, runtime, and troubleshooting orientation.'],
  ['Trial platforms', 'Controlled rollout', 'QQ and Douyin stay governed trial paths while Bilibili remains the primary shipped platform.'],
];

const features = [
  ['Comment intake pipeline', 'Receive comment events, deduplicate, enforce cooldown, run safety checks, and prepare publish decisions.'],
  ['Bilibili operations', 'Manage credentials, monitored videos, polling behavior, diagnostics, and publishing controls.'],
  ['Admin control plane', 'Operate jobs, knowledge, memory, role cards, style profiles, gateway logs, audit summaries, and query tools.'],
  ['Companion surface', 'Expose the pet-facing UI through backend-served `/companion` assets and companion state endpoints.'],
  ['Delivery gates', 'Use readiness, strict smoke, and package build checks as release truth sources instead of visual inspection alone.'],
  ['Trial adapters', 'Keep QQ and Douyin in governed rollout lanes without overstating them as primary delivery surfaces.'],
];

const responsibilities = [
  ['Admin UI', 'Operator surface', 'Jobs, memory, knowledge, pet-core, gateway, diagnostics, and platform controls.'],
  ['Companion Web', 'Pet-facing surface', 'Shows companion state, rituals, timeline, and degraded fallback when backend state is unavailable.'],
  ['Fastify API', 'Boundary layer', 'Serves admin APIs, readiness, companion routes, gateway operations, and static runtime assets.'],
  ['Bilibili Poller', 'Comment intake', 'Polls monitored videos and injects comments into the internal workflow.'],
  ['BullMQ Worker', 'Async executor', 'Consumes queued events and advances moderation, publishing, and retry workflows.'],
  ['Redis Queue', 'Isolation layer', 'Decouples intake from processing and carries retries, scheduling, and queue health signals.'],
  ['Prisma', 'Data access', 'Persists jobs, logs, memory entities, credentials, and related runtime state.'],
  ['SQLite / libSQL', 'Default storage', 'Current default persistence layer for local and containerized runtime paths.'],
  ['Readiness', 'Release gate', 'Reports foundation, delivery, and product blockers as explicit deployment signals.'],
];

const stack = [
  ['Backend', 'Node.js 20, TypeScript 5, Fastify 5, Prisma 7, Vitest'],
  ['Frontend', 'Vite 6, native ES modules, native CSS, no React or Vue'],
  ['Infra', 'Docker, Docker Compose, Redis 7, SQLite or libSQL'],
  ['Worker model', 'BullMQ, ioredis, comment-event queue, polling scheduler'],
];

const lifecycle = [
  ['Observed comment', 'The poller or webhook path receives a comment event and preserves source context.'],
  ['Deduplicated', 'Cooldown and dedupe logic prevent repeated or noisy replies.'],
  ['Safety checked', 'Policy and safety filters decide whether the event can continue.'],
  ['Draft generated', 'The system prepares a reply or publish intent using runtime context and operator data.'],
  ['Reviewed or auto-published', 'Policy decides whether human approval is required before publish.'],
  ['Published or rejected', 'Gateway and platform handling record the final outcome.'],
  ['Audited', 'Every key outcome becomes traceable through logs and audit surfaces.'],
];

const principles = [
  ['Bilibili-first delivery', 'The primary product promise stays centered on the Bilibili automation path.', 'Trial platforms must not be mistaken for the main shipped contract.'],
  ['Queue isolation', 'Comment intake and async processing stay decoupled through Redis and BullMQ.', 'This improves resilience but requires queue and worker observability.'],
  ['Human-in-the-loop', 'Approval remains part of the publish path whenever safety or operator review matters.', 'The system trades some automation speed for safer publish behavior.'],
  ['Readiness over guesswork', 'Release truth comes from foundation, delivery, and product gates.', 'A running process is not enough to call the system ready.'],
  ['Static runtime surfaces', 'Admin and companion bundles are delivered as backend-served static assets.', 'Frontend changes must preserve the backend-served asset contract.'],
  ['Docs as release support', 'This docs site explains the runtime and release shape without becoming the runtime itself.', 'Documentation should clarify delivery truth, not create a parallel source of truth.'],
];

const deploySteps = [
  ['Prepare environment', 'Copy `.env.example` and configure credentials, Redis, database path, API key, and publish controls for the target environment.'],
  ['Bring up runtime services', 'Use the repository Docker Compose entrypoint for migrate, API, worker, and Redis so the main delivery topology stays aligned.'],
  ['Check readiness', 'Verify `/health`, `/readiness`, and the admin diagnostics surfaces before trusting the runtime.'],
  ['Verify package builds', 'Run backend, admin, companion, and docs build commands to keep the visual and runtime surfaces aligned.'],
  ['Deploy docs separately', 'Publish the docs site through the GitHub Pages workflow rather than coupling it to the business runtime deployment.'],
];

const ops = [
  'Confirm active Bilibili credentials and monitored video configuration before debugging downstream publish behavior.',
  'Check queue depth, worker logs, and Redis connectivity before treating a missing job as a frontend issue.',
  'Use audit and gateway logs to understand publish outcomes instead of inferring state from UI symptoms alone.',
  'Treat readiness blockers as the primary release signal for foundation, delivery, and product status.',
  'Re-run backend, admin, companion, and docs build paths before calling a release candidate stable.',
];

const troubleshooting = [
  ['Comments never become jobs', 'Poller, credentials, or monitored video config', 'Inspect credentials, monitored videos, poller logs, and platform route behavior.'],
  ['Jobs pile up and do not progress', 'Redis or worker runtime', 'Check Redis connectivity, worker process health, retry counts, and queue depth.'],
  ['Readiness says blocked', 'Configuration or dependency boundary', 'Follow the reported foundation, delivery, or product blockers instead of guessing the failed layer.'],
  ['Publish outcome missing', 'Gateway or approval flow', 'Check publish mode, approval status, gateway logs, and audit entries.'],
  ['Companion looks degraded', 'Companion state endpoint or backend runtime', 'Verify `/companion`, `/companion/state-v2`, and backend route health before changing the UI.'],
  ['Trial platform not available', 'Sidecar or rollout configuration', 'Inspect sidecar endpoint availability and `PLATFORM_*` environment settings.'],
];

const platforms = [
  ['Bilibili', 'Primary support', 'Polling, credentials, monitored videos, publish gateway, readiness diagnostics, and audit path.', 'Current shipped delivery surface.'],
  ['QQ', 'Trial support', '`qq-sidecar` path verified locally and in CI.', 'Still governed as a trial capability.'],
  ['Douyin', 'Trial support', 'Code and local validation exist for the sidecar path.', 'Remote rollout still depends on verified sidecar endpoint and environment config.'],
  ['Kuaishou', 'Reserved scaffold', 'Structural placeholder only.', 'Not a shipped delivery capability.'],
  ['WeChat', 'Not supported', 'Outside the current roadmap boundary.', 'Do not present it as available.'],
];

function renderCardGrid(items) {
  return items
    .map(
      ([title, body]) => `
        <article class="card">
          <h3>${title}</h3>
          <p>${body}</p>
        </article>
      `,
    )
    .join('');
}

function renderReaderPaths(items) {
  return items
    .map(
      ([title, question, body, links]) => `
        <article class="path-card">
          <h3>${title}</h3>
          <p class="question">${question}</p>
          <p>${body}</p>
          <div>${links.map((href) => `<a href="${href}">${href.replace('#', '')}</a>`).join('')}</div>
        </article>
      `,
    )
    .join('');
}

function renderBaseline(items) {
  return items
    .map(
      ([label, value, body]) => `
        <div class="metric">
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${body}</p>
        </div>
      `,
    )
    .join('');
}

function renderTable(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSteps(items) {
  return items
    .map(
      ([title, body], index) => `
        <li class="step">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <div>
            <h3>${title}</h3>
            <p>${body}</p>
          </div>
        </li>
      `,
    )
    .join('');
}

function renderHeroPanels(items) {
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
        </article>
      `,
    )
    .join('');
}

function renderPrinciples(items) {
  return items
    .map(
      ([title, why, tradeoff]) => `
        <article class="principle-card">
          <h3>${title}</h3>
          <p>${why}</p>
          <small>${tradeoff}</small>
        </article>
      `,
    )
    .join('');
}

function renderStatusTable(items) {
  return `
    <div class="status-table">
      ${items
        .map(
          ([label, status, note]) => `
            <div>
              <span>${label}</span>
              <strong>${status}</strong>
              <span>${note}</span>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderCallout(type, title, body) {
  return `
    <aside class="callout ${type}">
      <strong>${title}</strong>
      <p>${body}</p>
    </aside>
  `;
}

function createAppMarkup() {
  return `
    <header class="site-header">
      <a class="brand" href="#top" aria-label="Bilibili Electronic Pet documentation home">
        <span class="brand-mark">B</span>
        <span>Bilibili Electronic Pet</span>
      </a>
      <nav aria-label="Primary">
        <a href="#overview">Overview</a>
        <a href="#architecture">Architecture</a>
        <a href="#principles">Principles</a>
        <a href="#deploy">Deploy</a>
        <a href="#ops">Ops</a>
        <a href="#platforms">Platforms</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero" id="overview">
        <div class="hero-copy">
          <p class="eyebrow">Documentation · v1.3.0 docs release</p>
          <h1>One docs surface for product shape, runtime boundaries, and release truth.</h1>
          <p class="hero-text">
            This site explains what the repository actually ships today: the Bilibili-first automation flow,
            the TypeScript runtime, the operator-facing admin UI, the companion surface, and the readiness gates
            that define release confidence.
          </p>
          <div class="hero-actions">
            <a class="primary" href="#reader-paths">Choose a reading path</a>
            <a class="secondary" href="${releaseUrl}">View release</a>
          </div>
        </div>
        <div class="hero-grid">${renderHeroPanels(heroPanels)}</div>
      </section>

      <section id="reader-paths" class="section">
        <div class="section-heading">
          <p class="eyebrow">Reader paths</p>
          <h2>Start from the question you are trying to answer.</h2>
          <p>
            This documentation is organized for operators, developers, and release owners who need a fast route
            to the right subsystem instead of a long linear read.
          </p>
        </div>
        <div class="path-grid">${renderReaderPaths(readerPaths)}</div>
      </section>

      <section id="baseline" class="section">
        <div class="section-heading">
          <p class="eyebrow">Baseline</p>
          <h2>Separate the shipped runtime from the docs release.</h2>
          <p>
            The business runtime baseline and the docs site release are related, but they are not the same thing.
            Treat each release lane as its own deliverable.
          </p>
        </div>
        <div class="metrics-grid">${renderBaseline(baseline)}</div>
        ${renderCallout(
          'note',
          'GitHub Pages project site',
          `The published docs URL is <a href="${pagesUrl}">${pagesUrl}</a>. This is a repository project site, not a root user or organization site.`,
        )}
      </section>

      <section class="section split">
        <div>
          <p class="eyebrow">Launch status</p>
          <h2>What is visually complete today.</h2>
          <p>
            The admin surface is the mature operator-facing experience. The companion surface is runtime integrated
            but still product-partial. This docs site is the third visible layer.
          </p>
        </div>
        ${renderStatusTable(launchStatus)}
      </section>

      <section id="features" class="section">
        <div class="section-heading">
          <p class="eyebrow">Features</p>
          <h2>Feature map for the current repository baseline.</h2>
          <p>
            Read the system as one Bilibili-first operating workflow rather than as disconnected folders or
            standalone pages.
          </p>
        </div>
        <div class="card-grid">${renderCardGrid(features)}</div>
      </section>

      <section id="architecture" class="section architecture">
        <div class="section-heading">
          <p class="eyebrow">Architecture</p>
          <h2>Runtime surfaces and backend boundaries.</h2>
          <p>
            The backend, worker, queue, database, admin UI, and companion UI all belong to one delivery contract.
          </p>
        </div>
        <div class="diagram" role="img" aria-label="Runtime architecture diagram">
          <div>Admin UI</div>
          <div>Companion UI</div>
          <div class="wide">Fastify API · Readiness · Gateway · Audit</div>
          <div>Bilibili Poller</div>
          <div>BullMQ Worker</div>
          <div>Redis Queue</div>
          <div>Prisma</div>
          <div>SQLite / libSQL</div>
          <div>Static asset serving</div>
        </div>
        <div class="stack-grid">${renderCardGrid(stack)}</div>
        ${renderTable(['Surface', 'Primary role', 'Why it matters'], responsibilities)}
      </section>

      <section id="flow" class="section flow-deep">
        <div class="section-heading">
          <p class="eyebrow">Flow</p>
          <h2>Comment lifecycle from intake to audit.</h2>
          <p>
            This timeline is the main behavior path that the rest of the operator and readiness surfaces explain.
          </p>
        </div>
        <div class="timeline">
          ${lifecycle
            .map(
              ([state, trigger], index) => `
                <article>
                  <span>${String(index + 1).padStart(2, '0')}</span>
                  <h3>${state}</h3>
                  <p>${trigger}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <section id="principles" class="section">
        <div class="section-heading">
          <p class="eyebrow">Principles</p>
          <h2>Why the repository keeps these boundaries.</h2>
          <p>
            The architecture is only useful if the tradeoffs behind it stay explicit. These principles define the
            current delivery posture.
          </p>
        </div>
        <div class="principles-grid">${renderPrinciples(principles)}</div>
      </section>

      <section id="deploy" class="section">
        <div class="section-heading">
          <p class="eyebrow">Deploy</p>
          <h2>Release and deployment runbook.</h2>
          <p>
            Business services and docs publishing are intentionally separate. The runtime deploy path is not the same
            as the GitHub Pages docs path.
          </p>
        </div>
        ${renderCallout(
          'warning',
          'Before calling a release ready',
          'Use readiness, queue health, and package builds as release truth. A running process or a rendered page is not enough on its own.',
        )}
        <ol class="steps">${renderSteps(deploySteps)}</ol>
      </section>

      <section id="ops" class="section ops">
        <div class="section-heading">
          <p class="eyebrow">Operations</p>
          <h2>Operator checklist for live systems.</h2>
        </div>
        <ul>${ops.map((item) => `<li>${item}</li>`).join('')}</ul>
      </section>

      <section id="troubleshooting" class="section">
        <div class="section-heading">
          <p class="eyebrow">Troubleshooting</p>
          <h2>Map symptoms to the correct subsystem first.</h2>
          <p>
            Start from the failing boundary, then inspect the right logs, queue state, routes, or config instead of
            treating every problem as a frontend issue.
          </p>
        </div>
        ${renderTable(['Symptom', 'Likely boundary', 'Check first'], troubleshooting)}
      </section>

      <section id="platforms" class="section roadmap">
        <div>
          <p class="eyebrow">Platforms</p>
          <h2>Platform support status.</h2>
          <p>
            Bilibili is the primary shipped surface. QQ and Douyin remain governed trial lanes. Kuaishou is scaffolded
            only, and WeChat is outside the current scope.
          </p>
          ${renderCallout(
            'note',
            'Support boundary',
            'Trial capability is still useful for validation, but it must not be presented as equivalent to the primary shipped platform.',
          )}
        </div>
        ${renderTable(['Platform', 'Status', 'Capability', 'Notes'], platforms)}
      </section>
    </main>

    <footer>
      <p>Bilibili Electronic Pet documentation site · Repository baseline v1.3.0 · Docs release v1.3.0</p>
    </footer>
  `;
}

const appRoot = document.querySelector('#app');

if (appRoot) {
  appRoot.innerHTML = createAppMarkup();
}
