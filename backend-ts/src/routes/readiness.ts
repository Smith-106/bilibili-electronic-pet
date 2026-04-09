import type { FastifyInstance } from 'fastify';

import type { BilibiliDiagnostics, ConnectionStatus, RuntimeSettings } from '../server/contracts.js';

type DeliveryCapabilityMatrix = {
  blockers: string[];
  [key: string]: unknown;
};

type ReadinessSummary = {
  config: Record<string, unknown>;
  publish: Record<string, unknown>;
  kill_switch: boolean;
};

export type ReadinessRouteDependencies = {
  settings: RuntimeSettings;
  checkDatabaseConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  checkRedisConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  buildBilibiliDiagnostics: () => Promise<BilibiliDiagnostics> | BilibiliDiagnostics;
  buildDefaultReadinessSummary: (settings: RuntimeSettings) => ReadinessSummary;
  defaultBilibiliDiagnostics: (settings: RuntimeSettings) => Promise<BilibiliDiagnostics>;
  normalizePublishMode: (mode: string) => string;
  addBlocker: (target: string[], message: string) => void;
  buildDeliveryCapabilityMatrix: (
    settings: RuntimeSettings,
    diagnostics: BilibiliDiagnostics,
    effectivePublishMode: string,
  ) => DeliveryCapabilityMatrix;
};

export function registerReadinessRoute(app: FastifyInstance, deps: ReadinessRouteDependencies): void {
  app.get('/readiness', async () => {
    const dbStatus = await deps.checkDatabaseConnection();
    const redisStatus = await deps.checkRedisConnection();
    const configStatus = deps.buildDefaultReadinessSummary(deps.settings);

    const foundationBlockers: string[] = [];
    if (!dbStatus.connected) {
      deps.addBlocker(foundationBlockers, `database:${dbStatus.error ?? 'unavailable'}`);
    }
    if (!redisStatus.connected) {
      deps.addBlocker(foundationBlockers, `redis:${redisStatus.error ?? 'unavailable'}`);
    }
    const foundationReady = foundationBlockers.length === 0;

    let bilibiliDiagnostics: BilibiliDiagnostics;
    if (dbStatus.connected) {
      try {
        bilibiliDiagnostics = await deps.buildBilibiliDiagnostics();
      } catch {
        bilibiliDiagnostics = {
          ...(await deps.defaultBilibiliDiagnostics(deps.settings)),
          ready: false,
          blocking_reasons: ['dependency:diagnostics_unavailable'],
        };
      }
    } else {
      bilibiliDiagnostics = await deps.defaultBilibiliDiagnostics(deps.settings);
    }

    const checks =
      typeof bilibiliDiagnostics.checks === 'object' && bilibiliDiagnostics.checks !== null
        ? bilibiliDiagnostics.checks
        : {};
    const workerOrPublishCheck =
      typeof checks.worker_or_publish === 'object' && checks.worker_or_publish !== null
        ? (checks.worker_or_publish as { ready?: unknown; errors?: unknown })
        : {};
    const workerOrPublishErrors = Array.isArray(workerOrPublishCheck.errors) ? workerOrPublishCheck.errors : [];

    const releaseGates =
      typeof bilibiliDiagnostics.release_gates === 'object' && bilibiliDiagnostics.release_gates !== null
        ? bilibiliDiagnostics.release_gates
        : {};

    const effectivePublishMode = deps.normalizePublishMode(
      String(bilibiliDiagnostics.effective_publish_mode || deps.settings.publisherMode),
    );
    const nativePublishMode = effectivePublishMode === 'native_bilibili';
    const externalPublishMode = effectivePublishMode === 'webhook' || effectivePublishMode === 'real_publish';
    const deliveryCapablePublishMode = nativePublishMode || externalPublishMode;

    const workerOrPublishReady = Boolean(
      (releaseGates as Record<string, unknown>).worker_or_publish_ready ?? workerOrPublishCheck.ready ?? false,
    );

    const deliveryPathReady = nativePublishMode
      ? Boolean(bilibiliDiagnostics.ready)
      : externalPublishMode
        ? workerOrPublishReady
        : false;

    const deliveryCapabilities = deps.buildDeliveryCapabilityMatrix(
      deps.settings,
      bilibiliDiagnostics,
      effectivePublishMode,
    );

    const pollingRequested = deps.settings.bilibiliEnabled && deps.settings.bilibiliPollEnabled;

    const deliverySignals = {
      kill_switch_enabled: deps.settings.killSwitch,
      polling_requested: pollingRequested,
      poll_interval_seconds: deps.settings.bilibiliPollIntervalSeconds,
      worker_schedule_configured: pollingRequested && deps.settings.bilibiliPollIntervalSeconds >= 60,
      bilibili_diagnostics_ready: Boolean(bilibiliDiagnostics.ready),
      delivery_path_ready: deliveryPathReady,
      delivery_capable_publish_mode: deliveryCapablePublishMode,
      worker_or_publish_ready: workerOrPublishReady,
      raw_publish_mode: deps.normalizePublishMode(deps.settings.publisherMode),
      effective_publish_mode: effectivePublishMode,
    };

    const deliveryBlockers = [...foundationBlockers];

    if (deps.settings.killSwitch) {
      deps.addBlocker(deliveryBlockers, 'control:kill_switch_enabled');
    }
    if (pollingRequested && !redisStatus.connected) {
      deps.addBlocker(deliveryBlockers, 'worker:redis_unavailable_for_polling');
    }

    if (nativePublishMode) {
      for (const reason of bilibiliDiagnostics.blocking_reasons ?? []) {
        deps.addBlocker(deliveryBlockers, `bilibili:${reason}`);
      }
    } else if (externalPublishMode) {
      if (!workerOrPublishReady) {
        for (const reason of workerOrPublishErrors) {
          deps.addBlocker(deliveryBlockers, `bilibili:worker_or_publish:${String(reason)}`);
        }
      }
    } else {
      deps.addBlocker(
        deliveryBlockers,
        `bilibili:publish_mode_not_delivery_capable:${effectivePublishMode || 'unknown'}`,
      );
    }

    if (!deliveryPathReady) {
      deps.addBlocker(deliveryBlockers, 'bilibili:delivery_diagnostics_not_ready');
    }

    const deliveryReady = deliveryBlockers.length === 0 && deliveryCapabilities.blockers.length === 0;

    return {
      ready: foundationReady,
      database: dbStatus,
      redis: redisStatus,
      config: configStatus.config,
      publish: configStatus.publish,
      kill_switch: configStatus.kill_switch,
      foundation_ready: foundationReady,
      delivery_ready: deliveryReady,
      foundation_blockers: foundationBlockers,
      delivery_blockers: deliveryBlockers,
      blocking_reasons: deliveryBlockers,
      delivery_capability_blockers: deliveryCapabilities.blockers,
      delivery_capabilities: deliveryCapabilities,
      delivery_signals: deliverySignals,
      bilibili_diagnostics: bilibiliDiagnostics,
    };
  });
}
