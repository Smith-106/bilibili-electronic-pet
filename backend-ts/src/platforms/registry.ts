import type { RuntimeSettings } from '../server/contracts.js';
import { PLATFORM_NAMES, type PlatformAdapterContract, type PlatformName } from '../server/platform-contracts.js';
import type { CollectorSource } from '../services/collector.js';

export type PlatformIngressRoute = {
  path: string;
  source: CollectorSource;
  platform: PlatformName;
};

export type PlatformPollingRuntime = {
  enabled: boolean;
  intervalSeconds: number;
};

export type RegisteredPlatformAdapter = PlatformAdapterContract & {
  ingressRoutes: PlatformIngressRoute[];
  resolvePublishSource: (settings: RuntimeSettings) => string;
  isEnabled: (settings: RuntimeSettings) => boolean;
  resolvePollingRuntime: (env?: NodeJS.ProcessEnv) => PlatformPollingRuntime;
};

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseInteger(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

const PLATFORM_ADAPTERS: Record<PlatformName, RegisteredPlatformAdapter> = {
  bilibili: {
    platform: 'bilibili',
    adapterKey: 'bilibili-reference',
    supportsInboundEvents: true,
    supportsPublishing: true,
    supportsIdentityBinding: true,
    supportsConnectionHealth: true,
    ingressRoutes: [{ path: '/events/comment/bilibili', source: 'bilibili', platform: 'bilibili' }],
    resolvePublishSource: (settings) => settings.platformBilibiliPublishSource.trim() || 'bilibili-bot',
    isEnabled: (settings) => settings.platformBilibiliEnabled || settings.bilibiliEnabled,
    resolvePollingRuntime: (env = process.env) => ({
      enabled: parseBoolean(env.BILIBILI_POLL_ENABLED, false),
      intervalSeconds: parseInteger(env.BILIBILI_POLL_INTERVAL_SECONDS, 300),
    }),
  },
  douyin: {
    platform: 'douyin',
    adapterKey: 'douyin-sidecar-trial',
    supportsInboundEvents: true,
    supportsPublishing: true,
    supportsIdentityBinding: true,
    supportsConnectionHealth: true,
    ingressRoutes: [{ path: '/events/comment/douyin', source: 'douyin', platform: 'douyin' }],
    resolvePublishSource: (settings) => settings.platformDouyinPublishSource.trim() || 'douyin-bot',
    isEnabled: (settings) => settings.platformDouyinEnabled,
    resolvePollingRuntime: () => ({
      enabled: false,
      intervalSeconds: 300,
    }),
  },
  kuaishou: {
    platform: 'kuaishou',
    adapterKey: 'kuaishou-scaffold',
    supportsInboundEvents: true,
    supportsPublishing: true,
    supportsIdentityBinding: true,
    supportsConnectionHealth: true,
    ingressRoutes: [{ path: '/events/comment/kuaishou', source: 'kuaishou', platform: 'kuaishou' }],
    resolvePublishSource: (settings) => settings.platformKuaishouPublishSource.trim() || 'kuaishou-bot',
    isEnabled: (settings) => settings.platformKuaishouEnabled,
    resolvePollingRuntime: () => ({
      enabled: false,
      intervalSeconds: 300,
    }),
  },
};

export function resolvePlatformAdapter(platform: PlatformName): RegisteredPlatformAdapter {
  return PLATFORM_ADAPTERS[platform];
}

export function resolvePlatformBaseEnabled(platform: PlatformName, settings: RuntimeSettings): boolean {
  return resolvePlatformAdapter(platform).isEnabled(settings);
}

export function listPlatformAdapters(): RegisteredPlatformAdapter[] {
  return PLATFORM_NAMES.map((platform) => PLATFORM_ADAPTERS[platform]);
}

export function listPlatformIngressRoutes(): PlatformIngressRoute[] {
  return listPlatformAdapters().flatMap((adapter) => adapter.ingressRoutes);
}

export function listPublishingPlatforms(): PlatformName[] {
  return listPlatformAdapters()
    .filter((adapter) => adapter.supportsPublishing)
    .map((adapter) => adapter.platform);
}

export function resolvePlatformPollingRuntime(platform: PlatformName, env?: NodeJS.ProcessEnv): PlatformPollingRuntime {
  return resolvePlatformAdapter(platform).resolvePollingRuntime(env);
}
