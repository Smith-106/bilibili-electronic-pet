#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, '..');
const repoRoot = resolve(backendRoot, '..');

function parseBoolean(value, defaultValue = false) {
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

function parseArgs(argv) {
  const result = {
    baseUrl: null,
    apiKey: null,
    envFile: null,
    preflightOnly: false,
    expandedScopeTrial: false,
    reportPath: null,
    strict: false,
    preReleaseRealChain: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--help' || current === '-h') {
      result.help = true;
      continue;
    }

    if (current === '--strict') {
      result.strict = true;
      continue;
    }

    if (current === '--pre-release-real-chain') {
      result.preReleaseRealChain = true;
      continue;
    }

    if (current === '--preflight-only') {
      result.preflightOnly = true;
      continue;
    }

    if (current === '--expanded-scope-trial') {
      result.expandedScopeTrial = true;
      continue;
    }

    if (current.startsWith('--base-url=')) {
      result.baseUrl = current.slice('--base-url='.length);
      continue;
    }

    if (current === '--base-url' && next) {
      result.baseUrl = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--api-key=')) {
      result.apiKey = current.slice('--api-key='.length);
      continue;
    }

    if (current === '--api-key' && next) {
      result.apiKey = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--env-file=')) {
      result.envFile = current.slice('--env-file='.length);
      continue;
    }

    if (current === '--env-file' && next) {
      result.envFile = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--report=')) {
      result.reportPath = current.slice('--report='.length);
      continue;
    }

    if (current === '--report' && next) {
      result.reportPath = next;
      index += 1;
    }
  }

  return result;
}

function loadEnvFiles(explicitEnvFile) {
  const loaded = [];

  const candidates = explicitEnvFile
    ? [resolve(process.cwd(), explicitEnvFile)]
    : [resolve(backendRoot, '.env'), resolve(repoRoot, '.env')];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    loadDotenv({ path: candidate, override: false });
    loaded.push(candidate);
  }

  return loaded;
}

function usage() {
  return `Usage:
  node scripts/staging-check.mjs [options]

Options:
  --base-url <url>               API base URL, default http://127.0.0.1:18000
  --api-key <key>                Admin API key used for authenticated checks
  --env-file <path>              Explicit env file to load before checks
  --preflight-only               Print and optionally report external-delivery prerequisites without hitting the runtime
  --expanded-scope-trial         Require external-platform trial inputs during preflight
  --strict                       Require delivery-capable diagnostics checks
  --pre-release-real-chain       Require native Bilibili pre-release gates
  --report <path>                Write JSON report to the given path (preflight/pass/fail)
  --help                         Show this help

Environment fallbacks:
  BASE_URL, API_KEY, ENV_FILE, STRICT_SMOKE, PRE_RELEASE_REAL_CHAIN, REPORT_PATH
`;
}

function logPass(message) {
  console.log(`[PASS] ${message}`);
}

function logWarn(message) {
  console.warn(`[WARN] ${message}`);
}

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return null;
  }
  const outputPath = resolve(process.cwd(), reportPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

function summarizeRuntimeState(
  readinessPayload,
  bilibiliPayload,
  companionPayload,
  petOverviewPayload,
  platformsPayload,
) {
  const capabilityBlockers =
    readinessPayload?.delivery_capability_blockers ?? readinessPayload?.delivery_capabilities?.blockers ?? [];
  const diagnostics = bilibiliPayload?.diagnostics ?? {};
  const platformItems = Array.isArray(platformsPayload?.items) ? platformsPayload.items : [];
  const activeExternalTrials = platformItems
    .filter((entry) => entry?.platform !== 'bilibili' && entry?.enabled === true)
    .map((entry) => ({
      platform: entry.platform,
      status: entry.status ?? 'unknown',
      rollout_enabled: entry?.rolloutControl?.enabled ?? entry.enabled === true,
      rollout_stage: entry?.rolloutControl?.stage ?? null,
      adapter_key: entry?.adapterKey ?? null,
    }));

  return {
    source: 'target_runtime',
    readiness: {
      ready: readinessPayload?.ready === true,
      foundation_ready: readinessPayload?.foundation_ready === true,
      delivery_ready: readinessPayload?.delivery_ready === true,
      product_ready: readinessPayload?.product_ready === true,
      foundation_blockers: readinessPayload?.foundation_blockers ?? [],
      delivery_blockers: readinessPayload?.delivery_blockers ?? [],
      delivery_capability_blockers: capabilityBlockers,
      product_blockers: readinessPayload?.product_blockers ?? [],
    },
    config: readinessPayload?.config ?? {},
    publish: readinessPayload?.publish ?? {},
    pet_core: {
      public_state_version: companionPayload?.version ?? null,
      admin_state_version: petOverviewPayload?.item?.version ?? null,
      pet_name:
        companionPayload?.snapshot?.profile?.petName ??
        petOverviewPayload?.item?.snapshot?.profile?.petName ??
        null,
      proactive_signal_count:
        companionPayload?.snapshot?.proactiveSignals?.length ??
        petOverviewPayload?.item?.snapshot?.proactiveSignals?.length ??
        0,
    },
    platforms: {
      total: platformItems.length,
      active_external_trials: activeExternalTrials,
      bilibili_reference_status:
        platformItems.find((entry) => entry?.platform === 'bilibili')?.status ?? 'unknown',
    },
    bilibili: {
      diagnostics_ready: diagnostics?.ready === true,
      effective_publish_mode: diagnostics?.effective_publish_mode ?? null,
      blocking_reasons: diagnostics?.blocking_reasons ?? [],
      release_gates: diagnostics?.release_gates ?? {},
      signals: diagnostics?.signals ?? {},
    },
  };
}

let activeReportPath = null;
let activeReport = null;

function normalizeBaseUrl(value) {
  const base = hasText(value) ? String(value).trim() : 'http://127.0.0.1:18000';
  return base.endsWith('/') ? base : `${base}/`;
}

function buildUrl(baseUrl, relativePath) {
  return new URL(relativePath, baseUrl).toString();
}

function getDefaultSmokeHeaders() {
  const userAgent =
    String(process.env.SMOKE_USER_AGENT ?? '').trim() ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

  return {
    'user-agent': userAgent,
    accept: 'application/json, text/html, application/javascript, text/css;q=0.9, */*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
  };
}

function extractAssetPaths(html) {
  const matches = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:css|js))["']/gi)];
  const assets = new Set();
  for (const match of matches) {
    const rawPath = String(match[1] ?? '').trim();
    if (!rawPath) continue;
    assets.add(rawPath);
  }
  return [...assets];
}

function buildEnvMatrix(env, options) {
  const nativeRealChain = options.preReleaseRealChain;
  const strict = options.strict;
  const expandedScopeTrial = options.expandedScopeTrial;
  const publisherMode = String(env.PUBLISHER_MODE ?? 'manual_queue').trim().toLowerCase();
  const webhookMode = publisherMode === 'webhook';
  const envCredentialPresent =
    hasText(env.BILIBILI_SESSDATA) &&
    hasText(env.BILIBILI_BILI_JCT) &&
    hasText(env.BILIBILI_BUVID3);

  return [
    { name: 'API_KEY', required: strict || nativeRealChain, present: hasText(options.apiKey) },
    { name: 'DATABASE_URL', required: false, present: hasText(env.DATABASE_URL) },
    { name: 'REDIS_HOST', required: false, present: hasText(env.REDIS_HOST) },
    { name: 'REDIS_PORT', required: false, present: hasText(env.REDIS_PORT) },
    { name: 'CELERY_BROKER_URL', required: false, present: hasText(env.CELERY_BROKER_URL) },
    { name: 'CELERY_RESULT_BACKEND', required: false, present: hasText(env.CELERY_RESULT_BACKEND) },
    { name: 'GATEWAY_TOKEN', required: false, present: hasText(env.GATEWAY_TOKEN) },
    { name: 'GATEWAY_HMAC_SECRET', required: false, present: hasText(env.GATEWAY_HMAC_SECRET) },
    { name: 'LLM_PROVIDER', required: false, present: hasText(env.LLM_PROVIDER) },
    { name: 'LLM_API_KEY', required: String(env.LLM_PROVIDER ?? '').trim().toLowerCase() !== 'mock', present: hasText(env.LLM_API_KEY) },
    { name: 'PUBLISHER_MODE', required: strict, present: hasText(env.PUBLISHER_MODE) },
    { name: 'PUBLISHER_WEBHOOK_URL', required: strict && webhookMode, present: hasText(env.PUBLISHER_WEBHOOK_URL) },
    { name: 'PLATFORM_DOUYIN_ENABLED', required: expandedScopeTrial, present: hasText(env.PLATFORM_DOUYIN_ENABLED) },
    { name: 'PLATFORM_DOUYIN_WEBHOOK_URL', required: expandedScopeTrial, present: hasText(env.PLATFORM_DOUYIN_WEBHOOK_URL) },
    {
      name: 'PLATFORM_DOUYIN_WEBHOOK_TOKEN',
      required: false,
      present: hasText(env.PLATFORM_DOUYIN_WEBHOOK_TOKEN),
      note: 'Optional unless the external Douyin sidecar contract requires bearer authentication.',
    },
    { name: 'PLATFORM_DOUYIN_PUBLISH_SOURCE', required: expandedScopeTrial, present: hasText(env.PLATFORM_DOUYIN_PUBLISH_SOURCE) },
    { name: 'BILIBILI_ENABLED', required: nativeRealChain, present: hasText(env.BILIBILI_ENABLED) },
    { name: 'BILIBILI_PUBLISH_ENABLED', required: nativeRealChain, present: hasText(env.BILIBILI_PUBLISH_ENABLED) },
    { name: 'BILIBILI_POLL_ENABLED', required: false, present: hasText(env.BILIBILI_POLL_ENABLED) },
    {
      name: 'BILIBILI_SESSDATA/BILIBILI_BILI_JCT/BILIBILI_BUVID3',
      required: nativeRealChain,
      present: envCredentialPresent,
      note: 'May be replaced by an active DB credential at runtime',
    },
    {
      name: 'CREDENTIAL_ENCRYPTION_KEY (or legacy BILIBILI_COOKIE_ENCRYPTION_KEY)',
      required: false,
      present: hasText(env.CREDENTIAL_ENCRYPTION_KEY) || hasText(env.BILIBILI_COOKIE_ENCRYPTION_KEY),
      note: 'Required when runtime credentials are stored in the database',
    },
  ];
}

async function fetchText(url, options = {}) {
  const headers = new Headers(getDefaultSmokeHeaders());
  const extraHeaders = new Headers(options.headers || {});
  for (const [key, value] of extraHeaders.entries()) {
    headers.set(key, value);
  }
  try {
    const response = await fetch(url, { ...options, headers });
    const body = await response.text();
    if (response.status !== 403 || process.env.SMOKE_ALLOW_CURL_FALLBACK === 'false') {
      return { response, body };
    }
    logWarn(`Fetch received 403 for ${url}; retrying with curl fallback.`);
    return fetchTextViaCurl(url, { ...options, headers });
  } catch (error) {
    if (process.env.SMOKE_ALLOW_CURL_FALLBACK === 'false') {
      throw error;
    }
    logWarn(`Fetch failed for ${url}; retrying with curl fallback.`);
    return fetchTextViaCurl(url, { ...options, headers });
  }
}

async function fetchJson(url, options = {}) {
  const { response, body } = await fetchText(url, options);
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }
  return { response, body, parsed };
}

function buildAdminHeaders(apiKey) {
  const headers = getDefaultSmokeHeaders();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
}

function resolveCurlBinary() {
  if (process.platform === 'win32') {
    return 'curl.exe';
  }
  return 'curl';
}

function fetchTextViaCurl(url, options = {}) {
  const curlBin = resolveCurlBinary();
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'bili-pet-smoke-'));
  const bodyPath = resolve(tmpDir, 'body.txt');
  const args = ['-sS', '-L', '-o', bodyPath, '-w', '%{http_code}'];
  const directIp = String(process.env.SMOKE_DIRECT_IP ?? '').trim();

  if (options.method) {
    args.push('-X', String(options.method));
  }

  const headers = new Headers(options.headers || {});
  for (const [key, value] of headers.entries()) {
    args.push('-H', `${key}: ${value}`);
  }

  if (directIp) {
    const target = new URL(url);
    const port = target.port || (target.protocol === 'https:' ? '443' : '80');
    args.push('--resolve', `${target.hostname}:${port}:${directIp}`);
  }

  args.push(url);

  try {
    const result = spawnSync(curlBin, args, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`curl_exit_${result.status}: ${String(result.stderr || '').trim() || 'request_failed'}`);
    }

    const status = Number.parseInt(String(result.stdout || '').trim(), 10);
    const body = readFileSync(bodyPath, 'utf8');
    return {
      response: { status: Number.isFinite(status) ? status : 0 },
      body,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function summarizeDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== 'object') return 'missing diagnostics';
  const mode = String(diagnostics.effective_publish_mode ?? '').trim() || 'unknown';
  const ready = diagnostics.ready === true;
  const blocking = Array.isArray(diagnostics.blocking_reasons)
    ? diagnostics.blocking_reasons.map((item) => String(item)).filter(Boolean)
    : [];
  return `mode=${mode}, ready=${ready}, blocking=${blocking.join(',') || 'none'}`;
}

const DELIVERY_CAPABILITY_NAMES = [
  'llm_generation',
  'search_enrichment',
  'webhook_publish',
  'native_bilibili_publish',
];

function createPreflightCapability({
  capability,
  active,
  status,
  mode,
  requiredInputs = [],
  optionalInputs = [],
  missingInputs = [],
  notes = [],
}) {
  return {
    capability,
    active,
    status,
    ready: status === 'configured',
    mode,
    required_inputs: requiredInputs,
    optional_inputs: optionalInputs,
    missing_inputs: missingInputs,
    notes,
  };
}

function buildDeliveryPreflight(env, options = {}) {
  const expandedScopeTrial = options.expandedScopeTrial === true;
  const llmProvider = String(env.LLM_PROVIDER ?? 'mock').trim().toLowerCase() || 'mock';
  const llmMissing = [];
  const llmNotes = [];
  let llmStatus = 'configured';

  if (llmProvider === 'mock') {
    llmStatus = 'fallback_only';
    llmMissing.push('LLM_PROVIDER(non-mock)');
    llmNotes.push('Mock mode is acceptable for local smoke but does not validate real LLM generation.');
    llmNotes.push('OpenAI and Claude additionally require LLM_API_KEY.');
  } else if (!['openai', 'claude', 'ollama'].includes(llmProvider)) {
    llmStatus = 'unsupported';
    llmMissing.push('LLM_PROVIDER=<openai|claude|ollama>');
    llmNotes.push('Unsupported provider values will fail at runtime.');
  } else if (llmProvider === 'openai' || llmProvider === 'claude') {
    if (!hasText(env.LLM_API_KEY)) {
      llmStatus = 'missing_inputs';
      llmMissing.push('LLM_API_KEY');
    }
  } else {
    llmNotes.push('Ollama does not require LLM_API_KEY but still depends on a reachable Ollama endpoint.');
  }

  const searchProvider = String(env.SEARCH_PROVIDER ?? 'serpapi').trim().toLowerCase() || 'serpapi';
  const searchMissing = [];
  const searchNotes = [];
  let searchStatus = 'configured';

  if (!['serpapi', 'bing', 'google'].includes(searchProvider)) {
    searchStatus = 'unsupported';
    searchMissing.push('SEARCH_PROVIDER=<serpapi|bing|google>');
    searchNotes.push('Unsupported provider values will fail at runtime.');
  } else {
    if (!hasText(env.SEARCH_API_KEY)) {
      searchStatus = 'missing_inputs';
      searchMissing.push('SEARCH_API_KEY');
    }
    if (searchProvider === 'google' && !hasText(env.SEARCH_CX)) {
      searchStatus = 'missing_inputs';
      searchMissing.push('SEARCH_CX');
    }
  }

  const publisherMode = String(env.PUBLISHER_MODE ?? 'manual_queue').trim().toLowerCase() || 'manual_queue';
  const webhookActive = publisherMode === 'webhook';
  const webhookMissing = [];
  const webhookNotes = [];
  let webhookStatus = webhookActive ? 'configured' : 'inactive';

  if (webhookActive && !hasText(env.PUBLISHER_WEBHOOK_URL)) {
    webhookStatus = 'missing_inputs';
    webhookMissing.push('PUBLISHER_WEBHOOK_URL');
  }
  if (webhookActive) {
    webhookNotes.push('PUBLISHER_WEBHOOK_TOKEN is optional unless the downstream webhook requires authentication.');
  }

  const nativePublishEnabled =
    parseBoolean(env.BILIBILI_ENABLED, false) && parseBoolean(env.BILIBILI_PUBLISH_ENABLED, false);
  const realPublishMode = publisherMode === 'real_publish';
  const nativeCapabilityActive = nativePublishEnabled || realPublishMode;
  const nativeMissing = [];
  const nativeNotes = [];
  const envCredentialPresent =
    hasText(env.BILIBILI_SESSDATA) &&
    hasText(env.BILIBILI_BILI_JCT) &&
    hasText(env.BILIBILI_BUVID3);
  const encryptionKeyPresent =
    hasText(env.CREDENTIAL_ENCRYPTION_KEY) || hasText(env.BILIBILI_COOKIE_ENCRYPTION_KEY);
  let nativeStatus = nativeCapabilityActive ? 'configured' : 'inactive';

  if (nativeCapabilityActive && !envCredentialPresent) {
    nativeStatus = 'runtime_credentials_required';
    nativeMissing.push('BILIBILI_SESSDATA/BILIBILI_BILI_JCT/BILIBILI_BUVID3 or active DB credential');
    nativeNotes.push('An active database credential can satisfy runtime auth even when env cookies are absent.');
  }
  if (nativeCapabilityActive && !encryptionKeyPresent) {
    nativeNotes.push('Set CREDENTIAL_ENCRYPTION_KEY when runtime credentials will be stored in the database.');
  }
  if (realPublishMode) {
    nativeNotes.push('real_publish mode uses native Bilibili runtime credentials and delivery checks.');
  }

  const douyinTrialMissing = [];
  const douyinTrialNotes = [];
  let douyinTrialStatus = expandedScopeTrial ? 'configured' : 'inactive';

  if (expandedScopeTrial && !parseBoolean(env.PLATFORM_DOUYIN_ENABLED, false)) {
    douyinTrialStatus = 'missing_inputs';
    douyinTrialMissing.push('PLATFORM_DOUYIN_ENABLED=true');
  }
  if (expandedScopeTrial && !hasText(env.PLATFORM_DOUYIN_WEBHOOK_URL)) {
    douyinTrialStatus = 'missing_inputs';
    douyinTrialMissing.push('PLATFORM_DOUYIN_WEBHOOK_URL');
  }
  if (expandedScopeTrial && !hasText(env.PLATFORM_DOUYIN_PUBLISH_SOURCE)) {
    douyinTrialStatus = 'missing_inputs';
    douyinTrialMissing.push('PLATFORM_DOUYIN_PUBLISH_SOURCE');
  }
  if (expandedScopeTrial) {
    douyinTrialNotes.push('PLATFORM_DOUYIN_WEBHOOK_TOKEN is optional unless the external Douyin sidecar contract requires bearer auth.');
    douyinTrialNotes.push('This preflight only validates checker-side inputs. It does not prove the live host can reach the endpoint through WAF/Cloudflare.');
  }

  const capabilities = [
    createPreflightCapability({
      capability: 'llm_generation',
      active: true,
      status: llmStatus,
      mode: llmProvider,
      requiredInputs: ['LLM_PROVIDER', 'LLM_API_KEY (for OpenAI/Claude)'],
      optionalInputs: ['LLM_MODEL', 'LLM_BASE_URL', 'LLM_TIMEOUT', 'LLM_RETRIES'],
      missingInputs: llmMissing,
      notes: llmNotes,
    }),
    createPreflightCapability({
      capability: 'search_enrichment',
      active: true,
      status: searchStatus,
      mode: searchProvider,
      requiredInputs: ['SEARCH_PROVIDER', 'SEARCH_API_KEY', 'SEARCH_CX (Google only)'],
      optionalInputs: ['SEARCH_MAX_RESULTS', 'SEARCH_TIMEOUT'],
      missingInputs: searchMissing,
      notes: searchNotes,
    }),
    createPreflightCapability({
      capability: 'webhook_publish',
      active: webhookActive,
      status: webhookStatus,
      mode: publisherMode,
      requiredInputs: ['PUBLISHER_MODE=webhook', 'PUBLISHER_WEBHOOK_URL'],
      optionalInputs: ['PUBLISHER_WEBHOOK_TOKEN', 'PUBLISHER_TIMEOUT_SECONDS'],
      missingInputs: webhookMissing,
      notes: webhookNotes,
    }),
    createPreflightCapability({
      capability: 'native_bilibili_publish',
      active: nativeCapabilityActive,
      status: nativeStatus,
      mode: publisherMode,
      requiredInputs: [
        'PUBLISHER_MODE=real_publish or BILIBILI_ENABLED=true+BILIBILI_PUBLISH_ENABLED=true',
        'BILIBILI_SESSDATA/BILIBILI_BILI_JCT/BILIBILI_BUVID3 or active DB credential',
      ],
      optionalInputs: ['CREDENTIAL_ENCRYPTION_KEY', 'BILIBILI_BUVID4', 'BILIBILI_DEDEUSERID'],
      missingInputs: nativeMissing,
      notes: nativeNotes,
    }),
    createPreflightCapability({
      capability: 'external_platform_trial',
      active: expandedScopeTrial,
      status: douyinTrialStatus,
      mode: expandedScopeTrial ? 'expanded_scope_trial' : 'inactive',
      requiredInputs: [
        'PLATFORM_DOUYIN_ENABLED=true',
        'PLATFORM_DOUYIN_WEBHOOK_URL',
        'PLATFORM_DOUYIN_PUBLISH_SOURCE',
      ],
      optionalInputs: ['PLATFORM_DOUYIN_WEBHOOK_TOKEN'],
      missingInputs: douyinTrialMissing,
      notes: douyinTrialNotes,
    }),
  ];

  const blockers = capabilities
    .filter((entry) => entry.status !== 'configured' && entry.status !== 'inactive')
    .map((entry) => entry.capability);

  return {
    blockers,
    capabilities,
    summary: capabilities.map((entry) => ({
      capability: entry.capability,
      status: entry.status,
      mode: entry.mode,
      missing_inputs: entry.missing_inputs,
    })),
  };
}

function logDeliveryPreflight(preflight) {
  logInfo('External-delivery preflight:');
  for (const entry of preflight.capabilities) {
    const missing = entry.missing_inputs.length > 0 ? entry.missing_inputs.join(', ') : 'none';
    console.log(
      `[INFO] preflight ${entry.capability}: status=${entry.status}, mode=${entry.mode || 'unknown'}, missing=${missing}`,
    );
  }
}

function parseDeliveryCapabilityMatrix(rawMatrix, rawBlockers) {
  if (!rawMatrix || typeof rawMatrix !== 'object') {
    return { ok: false, error: 'readiness.delivery_capabilities is missing' };
  }

  const capabilities = Array.isArray(rawMatrix.capabilities) ? rawMatrix.capabilities : null;
  if (!capabilities) {
    return { ok: false, error: 'readiness.delivery_capabilities.capabilities must be an array' };
  }

  const blockers = Array.isArray(rawBlockers)
    ? rawBlockers.map((entry) => String(entry).trim()).filter(Boolean)
    : Array.isArray(rawMatrix.blockers)
      ? rawMatrix.blockers.map((entry) => String(entry).trim()).filter(Boolean)
      : null;
  if (!blockers) {
    return { ok: false, error: 'readiness.delivery_capability_blockers or readiness.delivery_capabilities.blockers must be an array' };
  }

  const statusByCapability = new Map();
  for (const entry of capabilities) {
    if (!entry || typeof entry !== 'object') continue;
    const capability = String(entry.capability ?? '').trim();
    const status = String(entry.status ?? '').trim();
    if (!capability || !status) continue;
    statusByCapability.set(capability, status);
  }

  for (const capability of DELIVERY_CAPABILITY_NAMES) {
    if (!statusByCapability.has(capability)) {
      return { ok: false, error: `readiness capability ${capability} is missing` };
    }
  }

  const unknownBlockers = blockers.filter((name) => !DELIVERY_CAPABILITY_NAMES.includes(name));
  if (unknownBlockers.length > 0) {
    return { ok: false, error: `readiness capability blockers contain unknown names: ${unknownBlockers.join(',')}` };
  }

  return {
    ok: true,
    blockers,
    statusByCapability,
  };
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  if (parsedArgs.help) {
    console.log(usage());
    return;
  }

  const envFiles = loadEnvFiles(parsedArgs.envFile ?? process.env.ENV_FILE);
  const baseUrl = normalizeBaseUrl(parsedArgs.baseUrl ?? process.env.BASE_URL);
  const apiKey = String(parsedArgs.apiKey ?? process.env.API_KEY ?? '').trim();
  const strict = parsedArgs.strict || parseBoolean(process.env.STRICT_SMOKE, false);
  const expandedScopeTrial = parsedArgs.expandedScopeTrial;
  const preReleaseRealChain =
    parsedArgs.preReleaseRealChain || parseBoolean(process.env.PRE_RELEASE_REAL_CHAIN, false);
  const preflightOnly = parsedArgs.preflightOnly;
  const reportPath = parsedArgs.reportPath ?? process.env.REPORT_PATH ?? null;

  const deliveryPreflight = buildDeliveryPreflight(process.env, { expandedScopeTrial });

  const report = {
    started_at: new Date().toISOString(),
    base_url: baseUrl.replace(/\/$/, ''),
    preflight_only: preflightOnly,
    expanded_scope_trial: expandedScopeTrial,
    strict,
    pre_release_real_chain: preReleaseRealChain,
    env_files: envFiles,
    env_matrix: buildEnvMatrix(process.env, { strict, preReleaseRealChain, expandedScopeTrial, apiKey }),
    delivery_preflight: deliveryPreflight,
    input_scopes: {
      checker_env: 'env_matrix and delivery_preflight describe the environment seen by staging-check itself',
      target_runtime:
        'runtime_summary describes the target service responses returned by /readiness, /api/admin/session/login, /companion/state-v2, protected /companion/actions, /api/admin/pet/overview, /api/admin/platforms, and /api/admin/bilibili/status',
    },
    checks: [],
    warnings: [],
  };

  activeReportPath = reportPath;
  activeReport = report;

  const record = (name, status, details = {}) => {
    report.checks.push({ name, status, ...details });
  };

  const fail = (name, message, details = {}) => {
    record(name, 'failed', { message, ...details });
    throw new Error(`${name}: ${message}`);
  };

  if (preReleaseRealChain && !strict) {
    fail('arguments', '--pre-release-real-chain requires --strict');
  }

  logInfo(`BASE_URL=${report.base_url}`);
  if (envFiles.length > 0) {
    logInfo(`Loaded env files: ${envFiles.join(', ')}`);
  }

  logDeliveryPreflight(deliveryPreflight);

  for (const entry of report.env_matrix) {
    if (entry.required && !entry.present) {
      const note = entry.note ? ` (${entry.note})` : '';
      logWarn(`Missing required staging input: ${entry.name}${note}`);
      report.warnings.push(`missing:${entry.name}`);
    }
  }

  if (preflightOnly) {
    report.completed_at = new Date().toISOString();
    report.status = deliveryPreflight.blockers.length > 0 ? 'preflight_incomplete' : 'preflight_ready';

    const outputPath = writeReport(reportPath, report);
    if (outputPath) {
      logInfo(`Report written to ${outputPath}`);
    }

    console.log('== STAGING PREFLIGHT COMPLETE ==');
    return;
  }

  const healthUrl = buildUrl(baseUrl, '/health');
  const { response: healthResponse, parsed: healthPayload } = await fetchJson(healthUrl);
  if (healthResponse.status !== 200 || healthPayload?.ok !== true) {
    fail('health', `expected 200 and {ok:true}, got status=${healthResponse.status}`);
  }
  record('health', 'passed', { http_status: healthResponse.status });
  logPass('health');

  const adminUrl = buildUrl(baseUrl, '/admin');
  const { response: adminResponse, body: adminHtml } = await fetchText(adminUrl);
  if (adminResponse.status !== 200 || !adminHtml.includes('<!doctype html>')) {
    fail('admin_html', `expected admin HTML, got status=${adminResponse.status}`);
  }
  const assetPaths = extractAssetPaths(adminHtml);
  if (assetPaths.length === 0) {
    fail('admin_assets', 'no CSS/JS asset references found in /admin HTML');
  }
  record('admin_html', 'passed', { asset_count: assetPaths.length });
  logPass(`admin HTML (${assetPaths.length} assets)`);

  for (const assetPath of assetPaths) {
    const assetUrl = buildUrl(baseUrl, assetPath);
    const { response: assetResponse } = await fetchText(assetUrl);
    if (assetResponse.status !== 200) {
      fail('admin_asset', `asset ${assetPath} returned status=${assetResponse.status}`, {
        asset: assetPath,
      });
    }
    record('admin_asset', 'passed', { asset: assetPath, http_status: assetResponse.status });
    logPass(`asset ${assetPath}`);
  }

  if (!apiKey) {
    if (strict || preReleaseRealChain) {
      fail('api_key', 'API key is required for strict/admin staging checks');
    }

    record('degraded_mode', 'passed', { reason: 'API key not provided; only basic health/admin checks executed' });
    logWarn('API key not provided. Finished in degraded mode after health + admin asset checks.');
  } else {
    const headers = buildAdminHeaders(apiKey);

    const readinessUrl = buildUrl(baseUrl, '/readiness');
    const { response: readinessResponse, parsed: readinessPayload } = await fetchJson(readinessUrl);
    if (readinessResponse.status !== 200 || readinessPayload?.ready !== true) {
      fail(
        'readiness',
        `expected readiness.ready=true, got status=${readinessResponse.status}, ready=${String(
          readinessPayload?.ready,
        )}`,
        { payload: readinessPayload },
      );
    }
    record('readiness', 'passed', {
      foundation_ready: readinessPayload.foundation_ready,
      delivery_ready: readinessPayload.delivery_ready,
      delivery_blockers: readinessPayload.delivery_blockers ?? [],
      delivery_capability_blockers:
        readinessPayload.delivery_capability_blockers ?? readinessPayload.delivery_capabilities?.blockers ?? [],
    });
    logPass('readiness');

    const capabilityMatrix = parseDeliveryCapabilityMatrix(
      readinessPayload?.delivery_capabilities,
      readinessPayload?.delivery_capability_blockers,
    );
    if (!capabilityMatrix.ok) {
      fail('delivery_capability_contract', capabilityMatrix.error);
    }
    record('delivery_capability_contract', 'passed', {
      blockers: capabilityMatrix.blockers,
      statuses: DELIVERY_CAPABILITY_NAMES.map((name) => ({
        capability: name,
        status: capabilityMatrix.statusByCapability.get(name),
      })),
    });
    logPass('delivery capability contract');

    const loginUrl = buildUrl(baseUrl, '/api/admin/session/login');
    const { response: loginResponse, parsed: loginPayload } = await fetchJson(loginUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const sessionToken = String(loginPayload?.session_token ?? '').trim();
    if (loginResponse.status !== 200 || loginPayload?.ok !== true || !hasText(sessionToken)) {
      fail('admin_session_login', `expected ok=true and session_token, got status=${loginResponse.status}`, {
        payload: loginPayload,
      });
    }
    record('admin_session_login', 'passed', {
      http_status: loginResponse.status,
      expires_at: loginPayload?.expires_at ?? null,
    });
    logPass('admin session login');

    const overviewUrl = buildUrl(baseUrl, '/api/admin/overview');
    const { response: overviewResponse, parsed: overviewPayload } = await fetchJson(overviewUrl, { headers });
    if (overviewResponse.status !== 200 || overviewPayload?.ok !== true) {
      fail('admin_overview', `expected ok=true, got status=${overviewResponse.status}`);
    }
    record('admin_overview', 'passed', { http_status: overviewResponse.status });
    logPass('admin overview');

    const companionStateUrl = buildUrl(baseUrl, '/companion/state-v2');
    const { response: companionResponse, parsed: companionPayload } = await fetchJson(companionStateUrl);
    if (companionResponse.status !== 200 || companionPayload?.version !== 'v2') {
      fail('companion_state_v2', `expected version=v2, got status=${companionResponse.status}`, {
        payload: companionPayload,
      });
    }
    record('companion_state_v2', 'passed', {
      pet_name: companionPayload?.snapshot?.profile?.petName ?? null,
      proactive_signal_count: companionPayload?.snapshot?.proactiveSignals?.length ?? 0,
    });
    logPass('companion state v2');

    const protectedCompanionActionUrl = buildUrl(baseUrl, '/companion/actions');
    const { response: protectedCompanionActionResponse, parsed: protectedCompanionActionPayload } = await fetchJson(
      protectedCompanionActionUrl,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-session': sessionToken,
        },
        body: JSON.stringify({
          action: 'pat',
          note: 'staging smoke',
        }),
      },
    );
    if (
      protectedCompanionActionResponse.status !== 200
      || protectedCompanionActionPayload?.ok !== true
      || protectedCompanionActionPayload?.action !== 'pat'
      || !hasText(protectedCompanionActionPayload?.item_key)
    ) {
      fail(
        'protected_companion_action',
        `expected ok=true and action=pat, got status=${protectedCompanionActionResponse.status}`,
        {
          payload: protectedCompanionActionPayload,
        },
      );
    }
    record('protected_companion_action', 'passed', {
      action: protectedCompanionActionPayload.action,
      item_key: protectedCompanionActionPayload.item_key,
    });
    logPass('protected companion action');

    const petOverviewUrl = buildUrl(baseUrl, '/api/admin/pet/overview');
    const { response: petOverviewResponse, parsed: petOverviewPayload } = await fetchJson(petOverviewUrl, { headers });
    if (petOverviewResponse.status !== 200 || petOverviewPayload?.ok !== true || petOverviewPayload?.item?.version !== 'v2') {
      fail('pet_overview', `expected ok=true and item.version=v2, got status=${petOverviewResponse.status}`, {
        payload: petOverviewPayload,
      });
    }
    record('pet_overview', 'passed', {
      pet_name: petOverviewPayload?.item?.snapshot?.profile?.petName ?? null,
    });
    logPass('pet overview');

    const platformConnectionsUrl = buildUrl(baseUrl, '/api/admin/platforms');
    const { response: platformConnectionsResponse, parsed: platformConnectionsPayload } = await fetchJson(
      platformConnectionsUrl,
      { headers },
    );
    if (platformConnectionsResponse.status !== 200 || platformConnectionsPayload?.ok !== true) {
      fail('platform_connections', `expected ok=true, got status=${platformConnectionsResponse.status}`);
    }
    const platformItems = Array.isArray(platformConnectionsPayload?.items) ? platformConnectionsPayload.items : [];
    if (!Array.isArray(platformConnectionsPayload?.items)) {
      fail('platform_connections', 'expected items array from /api/admin/platforms');
    }
    const activeExternalTrials = platformItems.filter(
      (entry) => entry?.platform !== 'bilibili' && entry?.enabled === true,
    );
    const connectedExternalTrials = activeExternalTrials.filter(
      (entry) => entry?.status === 'connected' && (entry?.rolloutControl?.enabled ?? true),
    );
    record('platform_connections', 'passed', {
      total: platformItems.length,
      active_external_trials: activeExternalTrials.map((entry) => entry.platform),
      connected_external_trials: connectedExternalTrials.map((entry) => entry.platform),
    });
    logPass('platform connections');

    const bilibiliStatusUrl = buildUrl(baseUrl, '/api/admin/bilibili/status');
    const { response: bilibiliResponse, parsed: bilibiliPayload } = await fetchJson(bilibiliStatusUrl, { headers });
    if (bilibiliResponse.status !== 200 || bilibiliPayload?.ok !== true) {
      fail('bilibili_status', `expected ok=true, got status=${bilibiliResponse.status}`);
    }
    report.runtime_summary = summarizeRuntimeState(
      readinessPayload,
      bilibiliPayload,
      companionPayload,
      petOverviewPayload,
      platformConnectionsPayload,
    );
    record('bilibili_status', 'passed', {
      diagnostics: summarizeDiagnostics(bilibiliPayload.diagnostics),
    });
    logPass('bilibili status');

    const checkerEnvHasRequiredGaps = report.env_matrix.some((entry) => entry.required && !entry.present);
    if ((checkerEnvHasRequiredGaps || deliveryPreflight.blockers.length > 0) && readinessPayload?.delivery_ready === true) {
      const warningCode = 'checker_env_differs_from_target_runtime';
      if (!report.warnings.includes(warningCode)) {
        report.warnings.push(warningCode);
      }
      logWarn(
        'Checker env suggests missing or fallback delivery inputs, but the target runtime reports delivery-ready. Treat env_matrix/delivery_preflight as checker-side context and runtime_summary as the target-service view.',
      );
    }

    if (strict) {
      const diagnostics = bilibiliPayload?.diagnostics;
      const checks = diagnostics?.checks ?? {};
      const releaseGates = diagnostics?.release_gates ?? {};
      const effectivePublishMode = String(diagnostics?.effective_publish_mode ?? '').trim();
      const workerOrPublishReady = Boolean(
        releaseGates.worker_or_publish_ready ?? checks.worker_or_publish?.ready ?? false,
      );
      const nativeCapabilityStatus = capabilityMatrix.statusByCapability.get('native_bilibili_publish') ?? 'unknown';
      const webhookCapabilityStatus = capabilityMatrix.statusByCapability.get('webhook_publish') ?? 'unknown';

      if (effectivePublishMode === 'native_bilibili') {
        if (nativeCapabilityStatus !== 'configured') {
          fail(
            'strict_delivery',
            `native_bilibili_publish capability is ${nativeCapabilityStatus}; expected configured`,
          );
        }
        if (diagnostics?.ready !== true) {
          fail('strict_delivery', `native bilibili diagnostics are not ready (${summarizeDiagnostics(diagnostics)})`);
        }
      } else if (effectivePublishMode === 'webhook') {
        if (webhookCapabilityStatus !== 'configured') {
          fail('strict_delivery', `webhook_publish capability is ${webhookCapabilityStatus}; expected configured`);
        }
        if (!workerOrPublishReady) {
          fail(
            'strict_delivery',
            `${effectivePublishMode} mode is not delivery-ready (${summarizeDiagnostics(diagnostics)})`,
          );
        }
      } else if (effectivePublishMode === 'real_publish') {
        if (nativeCapabilityStatus !== 'configured') {
          fail(
            'strict_delivery',
            `native_bilibili_publish capability is ${nativeCapabilityStatus}; expected configured for real_publish`,
          );
        }
        if (!workerOrPublishReady) {
          fail(
            'strict_delivery',
            `${effectivePublishMode} mode is not delivery-ready (${summarizeDiagnostics(diagnostics)})`,
          );
        }
      } else {
        fail(
          'strict_delivery',
          `effective publish mode ${effectivePublishMode || 'unknown'} is not delivery-capable`,
        );
      }

      record('strict_delivery', 'passed', {
        effective_publish_mode: effectivePublishMode,
        worker_or_publish_ready: workerOrPublishReady,
        native_bilibili_publish_status: nativeCapabilityStatus,
        webhook_publish_status: webhookCapabilityStatus,
      });
      logPass(`strict delivery contract (${effectivePublishMode})`);

      const productBlockers = Array.isArray(readinessPayload?.product_blockers)
        ? readinessPayload.product_blockers
        : [];
      const productReadiness =
        readinessPayload?.product_readiness && typeof readinessPayload.product_readiness === 'object'
          ? readinessPayload.product_readiness
          : {};
      const productScope =
        productReadiness.scope && typeof productReadiness.scope === 'object'
          ? productReadiness.scope
          : {};
      const adminControlPlane =
        productReadiness.admin_control_plane && typeof productReadiness.admin_control_plane === 'object'
          ? productReadiness.admin_control_plane
          : {};
      const bilibiliDeliveryContract =
        productReadiness.bilibili_delivery_contract && typeof productReadiness.bilibili_delivery_contract === 'object'
          ? productReadiness.bilibili_delivery_contract
          : {};
      if (readinessPayload?.product_ready !== true) {
        fail(
          'strict_product',
          `product readiness is not ready (${productBlockers.join(',') || 'unknown'})`,
        );
      }
      if (productScope.key !== 'bilibili_first_admin_backend_mvp') {
        fail(
          'strict_product',
          `unexpected product scope ${String(productScope.key ?? 'unknown')}`,
        );
      }
      if (adminControlPlane.ready !== true) {
        fail('strict_product', 'admin control plane is not ready for the signed-off MVP scope');
      }
      if (bilibiliDeliveryContract.ready !== true) {
        fail('strict_product', 'bilibili delivery contract is not ready for the signed-off MVP scope');
      }

      record('strict_product', 'passed', {
        scope: productScope.key ?? null,
        admin_control_plane_ready: adminControlPlane.ready === true,
        bilibili_delivery_contract_ready: bilibiliDeliveryContract.ready === true,
      });
      logPass('strict product contract');

      if (preReleaseRealChain) {
        const diagnostics = bilibiliPayload?.diagnostics ?? {};
        const releaseGates = diagnostics.release_gates ?? {};
        const requiredTrueFields = [
          'pre_release_real_chain_ready',
          'real_auth_ready',
          'dependency_ready',
          'worker_or_publish_ready',
          'native_publish_enabled',
          'credential_present',
          'credential_complete',
        ];

        const fieldFailures = requiredTrueFields.filter((field) => releaseGates[field] !== true);
        if (String(diagnostics.effective_publish_mode ?? '').trim() !== 'native_bilibili') {
          fieldFailures.push(
            `effective_publish_mode=${String(diagnostics.effective_publish_mode ?? '').trim() || 'unknown'}`,
          );
        }
        if (readinessPayload?.delivery_ready !== true) {
          fieldFailures.push(`delivery_ready=${String(readinessPayload?.delivery_ready)}`);
        }
        if (nativeCapabilityStatus !== 'configured') {
          fieldFailures.push(`native_bilibili_publish.status=${nativeCapabilityStatus}`);
        }
        if (capabilityMatrix.blockers.includes('native_bilibili_publish')) {
          fieldFailures.push('delivery_capability_blockers includes native_bilibili_publish');
        }
        if (Array.isArray(releaseGates.blocking_reasons) && releaseGates.blocking_reasons.length > 0) {
          fieldFailures.push(`blocking_reasons=${releaseGates.blocking_reasons.join(',')}`);
        }

        if (fieldFailures.length > 0) {
          fail('pre_release_real_chain', fieldFailures.join('; '), {
            diagnostics: summarizeDiagnostics(diagnostics),
          });
        }

        record('pre_release_real_chain', 'passed', {
          effective_publish_mode: diagnostics.effective_publish_mode,
        });
        logPass('pre-release real chain contract');
      }
    }
  }

  report.completed_at = new Date().toISOString();
  report.status = 'passed';

  const outputPath = writeReport(reportPath, report);
  if (outputPath) {
    logInfo(`Report written to ${outputPath}`);
  }

  console.log('== STAGING CHECK PASS ==');
}

main().catch((error) => {
  if (activeReport) {
    activeReport.completed_at = new Date().toISOString();
    if (!activeReport.status || activeReport.status === 'passed') {
      activeReport.status = 'failed';
    }
    activeReport.error = error instanceof Error ? error.message : String(error);
    const outputPath = writeReport(activeReportPath, activeReport);
    if (outputPath) {
      logInfo(`Report written to ${outputPath}`);
    }
  }
  console.error(`== STAGING CHECK FAIL ==\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
