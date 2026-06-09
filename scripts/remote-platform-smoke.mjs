#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const SUPPORTED_PLATFORMS = new Set(['douyin', 'qq']);

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseArgs(argv) {
  const options = {
    platform: '',
    url: '',
    token: '',
    reportPath: '',
    replyText: 'remote production smoke publish',
    commentId: '',
    traceId: '',
    confirmRemote: false,
    allowLocal: false,
    timeoutSeconds: 15,
    qqTarget: 'group',
    qqGroupId: 'group-remote-smoke',
    qqUserId: 'user-remote-smoke',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--platform' && next) {
      options.platform = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--platform=')) {
      options.platform = current.slice('--platform='.length);
      continue;
    }
    if (current === '--url' && next) {
      options.url = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--url=')) {
      options.url = current.slice('--url='.length);
      continue;
    }
    if (current === '--token' && next) {
      options.token = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--token=')) {
      options.token = current.slice('--token='.length);
      continue;
    }
    if (current === '--report' && next) {
      options.reportPath = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--report=')) {
      options.reportPath = current.slice('--report='.length);
      continue;
    }
    if (current === '--reply-text' && next) {
      options.replyText = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--reply-text=')) {
      options.replyText = current.slice('--reply-text='.length);
      continue;
    }
    if (current === '--comment-id' && next) {
      options.commentId = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--comment-id=')) {
      options.commentId = current.slice('--comment-id='.length);
      continue;
    }
    if (current === '--trace-id' && next) {
      options.traceId = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--trace-id=')) {
      options.traceId = current.slice('--trace-id='.length);
      continue;
    }
    if (current === '--timeout-seconds' && next) {
      options.timeoutSeconds = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (current.startsWith('--timeout-seconds=')) {
      options.timeoutSeconds = Number.parseInt(current.slice('--timeout-seconds='.length), 10);
      continue;
    }
    if (current === '--qq-target' && next) {
      options.qqTarget = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--qq-target=')) {
      options.qqTarget = current.slice('--qq-target='.length);
      continue;
    }
    if (current === '--qq-group-id' && next) {
      options.qqGroupId = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--qq-group-id=')) {
      options.qqGroupId = current.slice('--qq-group-id='.length);
      continue;
    }
    if (current === '--qq-user-id' && next) {
      options.qqUserId = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--qq-user-id=')) {
      options.qqUserId = current.slice('--qq-user-id='.length);
      continue;
    }
    if (current === '--confirm-remote') {
      options.confirmRemote = true;
      continue;
    }
    if (current === '--allow-local') {
      options.allowLocal = true;
      continue;
    }
    if (current === '--help' || current === '-h') {
      options.help = true;
    }
  }

  return options;
}

function usage() {
  return `Usage:
  node scripts/remote-platform-smoke.mjs --platform douyin|qq --url <sidecar-base-or-publish-url> --confirm-remote [options]

Options:
  --token <token>             Bearer token for the sidecar /publish endpoint.
  --report <path>             Write machine-readable JSON evidence.
  --reply-text <text>         Smoke reply text.
  --comment-id <id>           Stable smoke comment/message id.
  --trace-id <id>             Stable trace id.
  --timeout-seconds <number>  Request timeout, default 15.
  --qq-target group|private   QQ route target, default group.
  --qq-group-id <id>          QQ group id for group smoke.
  --qq-user-id <id>           QQ user id for private smoke.
  --allow-local               Test localhost; use only for script tests, not production signoff.
  --confirm-remote            Required. Confirms this request may publish to the provided remote endpoint.

The script refuses localhost and example URLs by default. A passed report is valid production signoff evidence
only when it was run with --confirm-remote against a non-local verified endpoint.
`;
}

function normalizePlatform(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isLocalOrPlaceholderUrl(value) {
  if (!/^https?:\/\//i.test(String(value))) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)
      || host.endsWith('.localhost')
      || host === 'example.com'
      || host === 'example.invalid'
      || host.endsWith('.example')
      || String(value).includes('replace-with')
    );
  } catch {
    return true;
  }
}

export function resolveSidecarUrls(rawUrl) {
  if (!hasText(rawUrl)) {
    throw new Error('url_required');
  }
  const input = new URL(rawUrl);
  const publishUrl = new URL(input.toString());
  const healthUrl = new URL(input.toString());

  if (publishUrl.pathname.replace(/\/+$/, '').endsWith('/publish')) {
    healthUrl.pathname = publishUrl.pathname.replace(/\/publish\/?$/, '/health');
  } else {
    publishUrl.pathname = `${publishUrl.pathname.replace(/\/+$/, '')}/publish`;
    healthUrl.pathname = `${healthUrl.pathname.replace(/\/+$/, '')}/health`;
  }
  publishUrl.search = '';
  healthUrl.search = '';
  publishUrl.hash = '';
  healthUrl.hash = '';

  return {
    publishUrl: publishUrl.toString(),
    healthUrl: healthUrl.toString(),
  };
}

function buildPayload(platform, options) {
  const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
  const commentId = hasText(options.commentId)
    ? options.commentId.trim()
    : `${platform}-remote-smoke-${timestamp}`;
  const traceId = hasText(options.traceId)
    ? options.traceId.trim()
    : `${platform}-remote-smoke-${timestamp}`;
  const base = {
    platform,
    comment_id: commentId,
    reply_text: options.replyText,
    force_publish: false,
    trace_id: traceId,
  };

  if (platform !== 'qq') {
    return base;
  }

  if (options.qqTarget === 'private') {
    return {
      ...base,
      target_kind: 'message',
      canonical_id: `qq:${commentId}`,
      parent_external_id: commentId,
      routing_metadata: {
        chat_type: 'private',
        user_id: options.qqUserId,
      },
    };
  }

  return {
    ...base,
    target_kind: 'message',
    canonical_id: `qq:${commentId}`,
    container_id: options.qqGroupId,
    parent_external_id: commentId,
    routing_metadata: {
      chat_type: 'group',
      group_id: options.qqGroupId,
    },
  };
}

async function fetchJson(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);
  const text = await response.text();
  let parsed = {};
  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw_text: text.slice(0, 500) };
    }
  }
  return { response, parsed };
}

export async function runRemotePlatformSmoke(rawOptions, dependencies = {}) {
  const options = {
    ...parseArgs([]),
    ...rawOptions,
  };
  const platform = normalizePlatform(options.platform);
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new Error('platform_required:douyin_or_qq');
  }
  if (!options.confirmRemote) {
    throw new Error('confirm_remote_required');
  }

  const urls = resolveSidecarUrls(options.url);
  if (!options.allowLocal && (isLocalOrPlaceholderUrl(urls.publishUrl) || isLocalOrPlaceholderUrl(urls.healthUrl))) {
    throw new Error('remote_endpoint_required');
  }

  const timeoutMs = Number.isFinite(options.timeoutSeconds) && options.timeoutSeconds > 0
    ? options.timeoutSeconds * 1000
    : 15_000;
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch_unavailable');
  }

  const startedAt = new Date().toISOString();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (hasText(options.token)) {
    headers.Authorization = `Bearer ${options.token.trim()}`;
  }

  const health = await fetchJson(fetchImpl, urls.healthUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!health.response.ok || health.parsed?.ok !== true) {
    throw new Error(`health_failed:${health.response.status}`);
  }

  const payload = buildPayload(platform, options);
  const publish = await fetchJson(fetchImpl, urls.publishUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!publish.response.ok || publish.parsed?.published === false) {
    const reason = hasText(publish.parsed?.reason) ? publish.parsed.reason : `publish_failed:${publish.response.status}`;
    throw new Error(reason);
  }

  return {
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    mode: 'remote-platform-smoke',
    status: 'passed',
    platform,
    remote: !options.allowLocal,
    production_signoff: !options.allowLocal,
    target_url: urls.publishUrl,
    health_url: urls.healthUrl,
    token_configured: hasText(options.token),
    request: {
      payload: {
        ...payload,
        reply_text: '[redacted smoke text]',
      },
    },
    health: {
      http_status: health.response.status,
      body: health.parsed,
    },
    publish: {
      http_status: publish.response.status,
      body: publish.parsed,
    },
  };
}

function writeReport(reportPath, report) {
  if (!hasText(reportPath)) return null;
  const outputPath = resolve(process.cwd(), reportPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

function isDirectExecution() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectExecution()) {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  runRemotePlatformSmoke(options)
    .then((report) => {
      const outputPath = writeReport(options.reportPath, report);
      console.log(JSON.stringify(report, null, 2));
      if (outputPath) {
        console.log(`Report written to ${outputPath}`);
      }
    })
    .catch((error) => {
      const report = {
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        mode: 'remote-platform-smoke',
        status: 'failed',
        platform: normalizePlatform(options.platform) || null,
        target_url: hasText(options.url) ? options.url : null,
        remote: false,
        production_signoff: false,
        error: error instanceof Error ? error.message : String(error),
      };
      const outputPath = writeReport(options.reportPath, report);
      console.error(JSON.stringify(report, null, 2));
      if (outputPath) {
        console.error(`Report written to ${outputPath}`);
      }
      process.exit(1);
    });
}
