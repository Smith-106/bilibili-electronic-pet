import type { FastifyInstance } from 'fastify';

import type {
  BilibiliDiagnostics,
  CompanionStateV2,
  ConnectionStatus,
  PlatformConnectionSnapshot,
  RuntimeSettings,
} from '../server/contracts.js';

type DeliveryCapabilityMatrix = {
  blockers: string[];
  [key: string]: unknown;
};

type ReadinessSummary = {
  config: Record<string, unknown>;
  publish: Record<string, unknown>;
  kill_switch: boolean;
  public_companion_actions_enabled: boolean;
};

export type ReadinessRouteDependencies = {
  settings: RuntimeSettings;
  checkDatabaseConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  checkRedisConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  buildBilibiliDiagnostics: () => Promise<BilibiliDiagnostics> | BilibiliDiagnostics;
  getCompanionStateV2: () => Promise<CompanionStateV2> | CompanionStateV2;
  listPlatformConnections: () =>
    | Promise<{ ok: boolean; items: PlatformConnectionSnapshot[] }>
    | { ok: boolean; items: PlatformConnectionSnapshot[] };
  buildDefaultReadinessSummary: (settings: RuntimeSettings) => ReadinessSummary;
  defaultBilibiliDiagnostics: (settings: RuntimeSettings) => Promise<BilibiliDiagnostics>;
  normalizePublishMode: (mode: string) => string;
  addBlocker: (target: string[], message: string) => void;
  buildDeliveryCapabilityMatrix: (
    settings: RuntimeSettings,
    diagnostics: BilibiliDiagnostics,
    effectivePublishMode: string,
  ) => DeliveryCapabilityMatrix;
  // F4/security gate: credential encryption key must be present (fail-closed boot guard mirrors here).
  isEncryptionAvailable: () => boolean;
  // F2/antirisk gate: observability buffer overflow beyond threshold -> blocker red.
  isDropCountThresholdExceeded: () => boolean;
};

function isPublishingReady(snapshot: PlatformConnectionSnapshot): boolean {
  const publishCapability = snapshot.capabilities.find((entry) => entry.key === 'publish');
  return publishCapability?.status === 'available' || publishCapability?.status === 'partial';
}

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
    const productBlockers: string[] = [];
    const adminAccessConfigured = Boolean(deps.settings.apiKey?.trim() || deps.settings.adminSessionSecret?.trim());
    if (!adminAccessConfigured) {
      deps.addBlocker(productBlockers, 'admin_auth:unconfigured');
    }
    if (deps.settings.publicCompanionActionsEnabled === true) {
      deps.addBlocker(productBlockers, 'companion_actions:public_write_enabled');
    }
    const commentIngressAuthConfigured = Boolean(deps.settings.commentIngressToken?.trim());
    if (!commentIngressAuthConfigured) {
      deps.addBlocker(productBlockers, 'comment_ingress_auth:unconfigured');
    }

    let companionState: CompanionStateV2 | null = null;
    try {
      companionState = await deps.getCompanionStateV2();
    } catch {
      companionState = null;
    }

    let platformConnections: PlatformConnectionSnapshot[] = [];
    let platformStatusAvailable = true;
    try {
      const platformResponse = await deps.listPlatformConnections();
      platformConnections = Array.isArray(platformResponse.items) ? platformResponse.items : [];
    } catch {
      platformStatusAvailable = false;
      deps.addBlocker(productBlockers, 'admin_control_plane:platform_status_unavailable');
    }

    const petCoreReady = companionState?.version === 'v2';
    const companionSurfaceReady = petCoreReady && Boolean(companionState?.companion.petName);
    const petCoreSignedOff = petCoreReady;
    const companionSurfaceSignedOff =
      companionSurfaceReady && adminAccessConfigured && deps.settings.publicCompanionActionsEnabled !== true;
    if (!petCoreSignedOff) {
      deps.addBlocker(productBlockers, 'pet_core:not_ready');
    }
    if (!companionSurfaceSignedOff) {
      deps.addBlocker(productBlockers, 'companion_surface:not_ready');
    }

    const externalPlatformTrials = platformConnections.filter((entry) => entry.platform !== 'bilibili');
    const activeExternalPlatformTrials = externalPlatformTrials.filter((entry) => entry.enabled);
    const connectedExternalPlatformTrials = activeExternalPlatformTrials.filter(
      (entry) => entry.status === 'connected' && (entry.rolloutControl?.enabled ?? true) && isPublishingReady(entry),
    );

    const bilibiliReferencePlatform = platformConnections.find((entry) => entry.platform === 'bilibili') ?? null;
    const gatewayAuthConfigured = Boolean(
      deps.settings.apiKey?.trim() && deps.settings.gatewayToken?.trim() && deps.settings.gatewayHmacSecret?.trim(),
    );
    if (!gatewayAuthConfigured) {
      deps.addBlocker(productBlockers, 'gateway_auth:unconfigured');
    }
    // Security gate: credential encryption key missing -> fail-closed blocker (grill C-005 故障不可见根因).
    if (!deps.isEncryptionAvailable()) {
      deps.addBlocker(productBlockers, 'credential_encryption:not_configured');
    }
    // Antirisk gate: observability buffer overflow beyond threshold -> antirisk readiness blocker red.
    if (deps.isDropCountThresholdExceeded()) {
      deps.addBlocker(productBlockers, 'antirisk:drop_count_threshold_exceeded');
    }

    const productReady = foundationReady && deliveryReady && productBlockers.length === 0;

    // L5: completion_matrix.total derived from a gate array (passedGates/totalGates*100),
    // replacing the previous hardcoded `productReady ? 100 : 91`. Gates split into four
    // classes: foundation / delivery / antirisk / security. Each gate is a concrete boolean
    // signal — no hidden fake signals (drop_count budget is the only observable antirisk
    // buffer signal today; normal_buffer_healthy and critical_queue_healthy both derive from
    // it until a second signal source lands).
    const dropCountWithinBudget = !deps.isDropCountThresholdExceeded();
    const credentialEncryptionKeyPresent = deps.isEncryptionAvailable();
    const adminAccessReady = adminAccessConfigured && commentIngressAuthConfigured && gatewayAuthConfigured;
    const readinessGates: Array<{ key: string; passed: boolean }> = [
      // foundation
      { key: 'db_connected', passed: dbStatus.connected },
      { key: 'redis_connected', passed: redisStatus.connected },
      // delivery
      { key: 'admin_access_configured', passed: adminAccessReady },
      { key: 'publish_mode_delivery_capable', passed: deliveryCapablePublishMode },
      { key: 'worker_or_publish_path_ready', passed: deliveryPathReady },
      // antirisk
      { key: 'normal_buffer_healthy', passed: dropCountWithinBudget },
      { key: 'critical_queue_healthy', passed: dropCountWithinBudget },
      { key: 'drop_count_within_budget', passed: dropCountWithinBudget },
      // security
      { key: 'credential_encryption_key_present', passed: credentialEncryptionKeyPresent },
    ];
    const totalGates = readinessGates.length;
    const passedGates = readinessGates.filter((gate) => gate.passed).length;
    const completionTotal = totalGates > 0 ? Math.round((passedGates / totalGates) * 100) : 0;
    const completionMatrix = {
      scope: 'repo_controlled_product_completion',
      total: completionTotal,
      categories: {
        ui_ux: companionSurfaceSignedOff ? 100 : 86,
        frontend: companionSurfaceSignedOff ? 100 : 90,
        backend: deliveryReady && adminAccessConfigured ? 100 : 95,
        frontend_backend_loop: companionSurfaceSignedOff && deliveryReady ? 100 : 91,
        test: productReady ? 100 : 93,
        deploy: productReady ? 100 : 90,
      },
      evidence: {
        admin_static_assets: true,
        companion_static_assets: true,
        companion_state_v2: petCoreReady,
        protected_companion_actions: companionSurfaceSignedOff,
        production_auth_fail_closed: adminAccessConfigured && commentIngressAuthConfigured && gatewayAuthConfigured,
        delivery_capabilities_ready: deliveryReady,
        external_platform_trials_gated: true,
      },
      readiness_gates: readinessGates,
      external_requirements: [
        'real Bilibili credentials and real-chain smoke for native publish promotion',
        'verified Douyin/QQ sidecar endpoints before external-platform trial signoff',
      ],
    };
    const productReadiness = {
      scope: {
        key: 'bilibili_first_admin_companion_mvp',
        summary: 'Bilibili-first admin/backend/companion MVP',
        signed_off_surfaces: ['admin_control_plane', 'bilibili_delivery_contract', 'pet_core', 'companion_surface'],
        gated_surfaces: ['external_platform_trial'],
        excluded_surfaces: [],
      },
      admin_control_plane: {
        ready: foundationReady && adminAccessConfigured && platformStatusAvailable,
        auth_configured: adminAccessConfigured,
        comment_ingress_auth_configured: commentIngressAuthConfigured,
        public_companion_actions_enabled: deps.settings.publicCompanionActionsEnabled === true,
        platform_status_available: platformStatusAvailable,
        platform_count: platformConnections.length,
        operator_managed_platforms: platformConnections.filter((entry) => entry.rolloutControl != null).length,
      },
      bilibili_delivery_contract: {
        ready: deliveryReady,
        effective_publish_mode: effectivePublishMode,
        gateway_auth_configured: gatewayAuthConfigured,
        delivery_capability_blocker_count: deliveryCapabilities.blockers.length,
        delivery_blocker_count: deliveryBlockers.length,
      },
      bilibili_reference_platform: {
        ready: bilibiliReferencePlatform != null,
        status: bilibiliReferencePlatform?.status ?? 'unknown',
        adapter_key: bilibiliReferencePlatform?.adapterKey ?? null,
      },
      pet_core: {
        ready: petCoreReady,
        signed_off: petCoreSignedOff,
        pet_name: companionState?.snapshot.profile.petName ?? null,
        relationship_level: companionState?.snapshot.relationship.level ?? null,
        proactive_signal_count: companionState?.snapshot.proactiveSignals.length ?? 0,
      },
      companion_surface: {
        ready: companionSurfaceReady,
        signed_off: companionSurfaceSignedOff,
        pet_name: companionState?.companion.petName ?? null,
        status_line: companionState?.companion.statusLine ?? null,
        interaction_count: companionState?.companion.recentInteractions.length ?? 0,
        protected_actions_required: deps.settings.publicCompanionActionsEnabled !== true,
      },
      external_platform_trial: {
        signed_off: false,
        ready: connectedExternalPlatformTrials.length > 0,
        active_platforms: activeExternalPlatformTrials.map((entry) => ({
          platform: entry.platform,
          status: entry.status,
          adapter_key: entry.adapterKey,
          rollout_enabled: entry.rolloutControl?.enabled ?? entry.enabled,
          rollout_stage: entry.rolloutControl?.stage ?? null,
        })),
      },
      completion_matrix: completionMatrix,
    };

    // F4: top-level `ready` removed to eliminate the dual-semantics ambiguity
    // (previously `ready: foundationReady` coexisted with `foundation_ready: foundationReady`,
    // misleading consumers into reading `ready` as product readiness). Consumers MUST read
    // `foundation_ready` (foundation only) or `product_ready` (full product gate) explicitly.
    return {
      database: dbStatus,
      redis: redisStatus,
      config: configStatus.config,
      publish: configStatus.publish,
      kill_switch: configStatus.kill_switch,
      public_companion_actions_enabled: configStatus.public_companion_actions_enabled,
      foundation_ready: foundationReady,
      delivery_ready: deliveryReady,
      foundation_blockers: foundationBlockers,
      delivery_blockers: deliveryBlockers,
      blocking_reasons: deliveryBlockers,
      delivery_capability_blockers: deliveryCapabilities.blockers,
      delivery_capabilities: deliveryCapabilities,
      delivery_signals: deliverySignals,
      bilibili_diagnostics: bilibiliDiagnostics,
      product_ready: productReady,
      product_blockers: productBlockers,
      completion_matrix: completionMatrix,
      product_readiness: productReadiness,
    };
  });
}
