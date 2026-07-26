import { getPlatformControlState, setPlatformControlState } from '../../platforms/control-state.js';
import { listPlatformAdapters, resolvePlatformAdapter } from '../../platforms/registry.js';
import type { PlatformName, PlatformConnectionSnapshot, RuntimeSettings } from '../contracts.js';
import { hasText } from '../normalizers.js';
import { defaultIsPlatformEnabled } from '../runtime-platform.js';

export function defaultListPlatformConnections(settings: RuntimeSettings): {
  ok: boolean;
  items: PlatformConnectionSnapshot[];
} {
  return {
    ok: true,
    items: listPlatformAdapters().map((adapter) => {
      const enabled = defaultIsPlatformEnabled(adapter.platform, settings);
      const supportsPolling = adapter.platform === 'bilibili';
      const pollingRuntime = adapter.resolvePollingRuntime(process.env);
      const control = getPlatformControlState(adapter.platform);
      const platformEnvPrefix = `PLATFORM_${adapter.platform.toUpperCase()}`;
      const sidecarWebhookConfigured =
        adapter.platform === 'bilibili' ? true : hasText(process.env[`${platformEnvPrefix}_WEBHOOK_URL`]);
      const status = !enabled
        ? 'disconnected'
        : adapter.platform === 'bilibili'
          ? settings.bilibiliEnabled
            ? 'connected'
            : 'degraded'
          : sidecarWebhookConfigured
            ? 'connected'
            : 'degraded';
      const lastError =
        status === 'degraded'
          ? adapter.platform === 'bilibili'
            ? 'runtime platform enabled but Bilibili runtime toggle is off'
            : 'sidecar webhook is not configured'
          : null;
      const publishCapabilityStatus = status === 'degraded' ? 'partial' : 'available';
      const publishCapabilityNote =
        adapter.platform === 'bilibili'
          ? adapter.resolvePublishSource(settings)
          : sidecarWebhookConfigured
            ? `${adapter.resolvePublishSource(settings)} via sidecar webhook`
            : `${adapter.resolvePublishSource(settings)} requires PLATFORM_${adapter.platform.toUpperCase()}_WEBHOOK_URL`;

      return {
        platform: adapter.platform,
        enabled,
        adapterKey: adapter.adapterKey,
        status,
        lastCheckedAt: null,
        lastError,
        rolloutControl: control
          ? {
              enabled: control.enabled,
              stage: control.stage,
              updatedAt: control.updatedAt,
            }
          : {
              enabled,
              stage: enabled ? 'trial' : 'paused',
              updatedAt: null,
            },
        capabilities: [
          {
            key: 'ingress',
            status: 'available',
            note: adapter.ingressRoutes.map((entry) => entry.path).join(', '),
          },
          {
            key: 'publish',
            status: publishCapabilityStatus,
            note: publishCapabilityNote,
          },
          {
            key: 'identity_binding',
            status: 'available',
          },
          {
            key: 'connection_health',
            status: 'available',
          },
          {
            key: 'polling',
            status: supportsPolling ? (pollingRuntime.enabled ? 'available' : 'partial') : 'planned',
            note: supportsPolling
              ? `${pollingRuntime.intervalSeconds}s interval`
              : 'No worker polling configured for this platform yet',
          },
        ],
      };
    }),
  };
}

export function defaultUpdatePlatformConnectionControl(
  settings: RuntimeSettings,
  input: { platform: PlatformName; enabled: boolean },
): { ok: boolean; item: PlatformConnectionSnapshot } {
  const adapter = resolvePlatformAdapter(input.platform);
  const baseEnabled = adapter.isEnabled(settings);
  if (!baseEnabled && input.enabled) {
    throw new Error('platform_not_configured');
  }

  setPlatformControlState(input.platform, { enabled: input.enabled });
  const item = defaultListPlatformConnections(settings).items.find(
    (entry) => entry.platform === input.platform,
  ) as PlatformConnectionSnapshot;
  return { ok: true, item };
}
