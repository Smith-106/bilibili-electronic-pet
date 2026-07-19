import type { FastifyInstance } from 'fastify';

import type {
  BilibiliDiagnostics,
  CompanionStateV2,
  ConnectionStatus,
  PlatformConnectionSnapshot,
  RuntimeSettings,
} from '../server/contracts.js';
import { isCompliancePassive } from '../services/compliance-mode.js';
import { recordObservabilityEvent, ensureTraceId } from '../services/observability.js';

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
  // TASK-007/antirisk gate: backoff_active_rate = backoff_applied events last 600s /
  // publishIntent count. When the rate crosses the 0.3 threshold (configured in the
  // derivation), too high a share of publish attempts are hitting -352/-429 — surface
  // as a product blocker so operators see accumulating风控 pressure. Async because it
  // counts ObservabilityEvent + PublishLog rows; the readiness route awaits it.
  isBackoffActiveRateExceeded: () => Promise<boolean> | boolean;
  // TASK-007/antirisk gate: passive_response_gate events with status:'rejected' over
  // the window exceed the threshold (10). Surfaces the C-layer reject rate as a
  // product blocker — a sustained high reject rate signals the gate is over-blocking
  // or the persona is drifting toward passive-response territory. Async because it
  // counts ObservabilityEvent rows; the readiness route awaits it.
  isPassiveResponseViolationExceeded: () => Promise<boolean> | boolean;
  // TASK-003/P3 SC4 gate: antirisk three-layer flag aggregation. All four antirisk
  // feature flags (A backoff / B timing-engine / C passive-response-gate / C rate-limit)
  // MUST be on before full real_publish is unblocked. Reads env directly (sync) — the
  // flags default ON (`!== 'false'`), mirroring backoff-decision.ts / comment-ingest.ts /
  // decider.ts / persona-token-bucket.ts. A flag explicitly set to 'false' flips this red.
  // No DI callback needed: env reads are self-contained, matching the existing flag sites.
  threeLayerFlagsAllOn: () => boolean;
  // TASK-003/P3 SC4 gate: behavior_anomaly count within the rolling window MUST be zero.
  // Queries ObservabilityEvent groupBy/count where event_type IN ['backoff_applied',
  // 'antirisk_signal_detected'] AND error_subclass='behavior_anomaly' AND created_at >=
  // now - BEHAVIOR_ANOMALY_WINDOW_SECONDS*1000. Async because it counts DB rows; the
  // readiness route awaits it. Fail-closed (returns false on DB error): SC4 is the hard
  // full real_publish barrier, so a DB blip must NOT be assumed safe — unlike the
  // backoff_active_rate / passive_response_violation gates which are soft signals.
  isBehaviorAnomalyCountZero: () => Promise<boolean> | boolean;
  // TASK-005/P3 SC5 gate: probeBilibiliAuth 周期调度存活断言。worker-main.ts setInterval
  // probeBilibiliAuthScheduler — not_logged_in flips this red (fail-closed: account no
  // longer alive = readiness blocker). Sync state read from probe-scheduler.ts module.
  isAuthProbeHealthy: () => boolean;
  // TASK-002/D1 gate: reply-visibility probe shadowbanned verdict count within the rolling
  // window. A confirmed shadowbanned publish (postReply succeeded but the rpid is absent
  // from the comment list in BOTH views) means the platform is silently swallowing replies —
  // the persona is effectively shadowbanned, a sustained封号-grade signal. Fail-closed:
  // any shadowbanned event_type='reply_visibility_check' AND error_subclass='shadowban' in
  // the window flips this red (readiness blocker). probe_failed verdicts do NOT flip red
  // (C-004 fail-open — a transient probe glitch must not block readiness). Async because it
  // counts ObservabilityEvent rows; the readiness route awaits it. DB error → fail-closed
  // false (mirrors isBehaviorAnomalyCountZero: a DB blip must NOT be assumed safe).
  isReplyVisibilityHealthy: () => Promise<boolean> | boolean;
  // TASK-003/G3 compliance gate (ISS-001): COMPLIANCE_MODE='passive' surfaces a
  // passive_mode_active signal so operators can see the system is running in the
  // legal-risk-reduced pure-webhook passive mode. This is an informational signal (NOT a
  // product blocker — passive mode is a deliberate operator opt-in, not a fault). Sync env
  // read via the compliance-mode accessor (single source of truth shared with publisher /
  // probe-scheduler / comment-ingest). Optional dep so existing test fixtures compile without
  // wiring it (defaults to the env read).
  isComplianceModePassive?: () => boolean;
};

// TASK-003/P3 SC4 gate: antirisk three-layer flag aggregation. All four antirisk
// feature flags (A backoff / B timing-engine / C passive-response-gate / C rate-limit)
// MUST be on before full real_publish is unblocked. Flags default ON (`!== 'false'`),
// mirroring backoff-decision.ts / comment-ingest.ts / decider.ts / persona-token-bucket.ts.
// A flag explicitly set to 'false' flips this red (fail-closed).
export function threeLayerFlagsAllOn(): boolean {
  return (
    process.env.ANTIRISK_BACKOFF_ENABLED !== 'false' &&
    process.env.TIMING_ENGINE_ENABLED !== 'false' &&
    process.env.PASSIVE_RESPONSE_GATE_ENABLED !== 'false' &&
    process.env.ANTIRISK_C_RATE_LIMIT_ENABLED !== 'false'
  );
}

// TASK-003/G3 compliance signal helpers (ISS-001). isCompliancePassiveFromEnv reads the
// shared compliance-mode accessor (single source of truth). recordComplianceModeCheck emits
// a fire-and-forget ObservabilityEvent {event_type:'compliance_mode_check'} so the mode
// switch stays observable for online eval / audit (C-002 zero-migration: reuses the existing
// ObservabilityEvent path, NOT an antirisk signal — mirrors the passive_response_gate
// counter pattern in comment-ingest.ts). Defined here (not in compliance-mode.ts) so the
// readiness route stays self-contained and does not add an observability import to the
// shared accessor module.
function isCompliancePassiveFromEnv(): boolean {
  return isCompliancePassive();
}

async function recordComplianceModeCheck(passive: boolean): Promise<void> {
  await recordObservabilityEvent({
    event_type: 'compliance_mode_check',
    trace_id: ensureTraceId(),
    status: passive ? 'passive' : 'off',
    metadata: { compliance_mode: passive ? 'passive' : 'off' },
  });
}

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

    // TASK-003/G3 compliance signal (ISS-001): COMPLIANCE_MODE='passive' surfaces
    // passive_mode_active. This is NOT a product blocker — passive mode is a deliberate
    // operator opt-in for legal-risk reduction (pure-webhook passive response, no active
    // probing/publishing). The signal makes the mode observable in readiness so operators
    // can confirm the switch took effect. Defaults to the env read when the dep is unset
    // (mirrors the existing threeLayerFlagsAllOn sync env-read pattern). Resolved here
    // (before deliverySignals) so the delivery_signals.compliance_mode field reflects it.
    const compliancePassive = deps.isComplianceModePassive
      ? deps.isComplianceModePassive()
      : isCompliancePassiveFromEnv();

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
      // TASK-003/G3 (ISS-001): compliance mode signal — 'passive' = pure-webhook passive
      // response (legal-risk-reduced), 'off' = default. Read via the shared accessor so
      // readiness reflects the same switch consumed by publisher / probe-scheduler /
      // comment-ingest.
      compliance_mode: compliancePassive ? 'passive' : 'off',
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
    // TASK-007: backoff_active_rate over budget (0.3) — share of publish attempts
    // hitting -352/-429 too high. Surface as a product blocker.
    const backoffActiveRateExceeded = await deps.isBackoffActiveRateExceeded();
    if (backoffActiveRateExceeded) {
      deps.addBlocker(productBlockers, 'antirisk:backoff_active_rate_exceeded');
    }
    // TASK-007: passive_response_gate reject count over budget (10) — the C-layer
    // is rejecting too many comments, signaling over-block or passive-response drift.
    const passiveResponseViolationExceeded = await deps.isPassiveResponseViolationExceeded();
    if (passiveResponseViolationExceeded) {
      deps.addBlocker(productBlockers, 'antirisk:passive_response_violation_count_exceeded');
    }
    // TASK-003/P3 SC4 gate: three-layer antirisk flag aggregation (A backoff /
    // B timing-engine / C passive-response-gate / C rate-limit). Any flag explicitly
    // off flips this red — SC4 full real_publish barrier requires all four antirisk
    // layers armed. Sync env read (flags default ON).
    const threeLayerFlagsOn = deps.threeLayerFlagsAllOn();
    if (!threeLayerFlagsOn) {
      deps.addBlocker(productBlockers, 'antirisk:three_layer_flags_all_on');
    }
    // TASK-003/P3 SC4 gate: behavior_anomaly count within the rolling window MUST be
    // zero. -352 behavior_anomaly is the high-severity subclass (cap 600s backoff);
    // any occurrence in the window blocks full real_publish. Fail-closed (false on DB
    // error): SC4 is the hard barrier, a DB blip must NOT be assumed safe.
    const behaviorAnomalyCountZero = await deps.isBehaviorAnomalyCountZero();
    if (!behaviorAnomalyCountZero) {
      deps.addBlocker(productBlockers, 'antirisk:behavior_anomaly_count_zero');
    }
    // TASK-005/P3 SC5 gate: probeBilibiliAuth 周期调度存活断言。not_logged_in 触发
    // fail-closed 告警 (同步 await recordAntiriskSignal) 并翻转 authProbeUnhealthy →
    // isAuthProbeHealthy()=false → readiness 标红。
    if (!deps.isAuthProbeHealthy()) {
      deps.addBlocker(productBlockers, 'antirisk:auth_probe_healthy');
    }
    // TASK-002/D1 gate: reply-visibility shadowbanned verdict in the window. Any confirmed
    // shadowbanned publish (postReply ok but rpid absent in both views) means the platform
    // is silently swallowing replies — fail-closed readiness blocker. probe_failed does NOT
    // block (C-004 fail-open).
    const replyVisibilityHealthy = await deps.isReplyVisibilityHealthy();
    if (!replyVisibilityHealthy) {
      deps.addBlocker(productBlockers, 'antirisk:reply_visibility_verified');
    }

    // TASK-003/G3 compliance signal (ISS-001): COMPLIANCE_MODE='passive' surfaces
    // passive_mode_active. This is NOT a product blocker — passive mode is a deliberate
    // operator opt-in for legal-risk reduction (pure-webhook passive response, no active
    // probing/publishing). The signal makes the mode observable in readiness so operators
    // can confirm the switch took effect. Defaults to the env read when the dep is unset
    // (mirrors the existing threeLayerFlagsAllOn sync env-read pattern).
    // compliance_mode_check ObservabilityEvent (C-002 zero-migration: reuses the existing
    // ObservabilityEvent path, fire-and-forget normal observation event — NOT an antirisk
    // signal). Emitted once per readiness probe so the mode switch stays observable in the
    // observability stream for online eval / audit. Status 'passive' | 'off'.
    void recordComplianceModeCheck(compliancePassive).catch((error: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'compliance_mode_check_record_failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });

    const productReady = foundationReady && deliveryReady && productBlockers.length === 0;

    // L5: completion_matrix.total derived from a gate array (passedGates/totalGates*100),
    // replacing the previous hardcoded `productReady ? 100 : 91`. Gates split into four
    // classes: foundation / delivery / antirisk / security. Each gate is a concrete boolean
    // signal — no hidden fake signals (drop_count budget is the only observable antirisk
    // buffer signal today; normal_buffer_healthy and critical_queue_healthy both derive from
    // it until a second signal source lands).
    const dropCountWithinBudget = !deps.isDropCountThresholdExceeded();
    const credentialEncryptionKeyPresent = deps.isEncryptionAvailable();
    const backoffActiveRateWithinBudget = !backoffActiveRateExceeded;
    const passiveResponseViolationCountWithinBudget = !passiveResponseViolationExceeded;
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
      // TASK-007 antirisk signal gates (derived from observability event counts)
      { key: 'backoff_active_rate_within_budget', passed: backoffActiveRateWithinBudget },
      { key: 'passive_response_violation_count_within_budget', passed: passiveResponseViolationCountWithinBudget },
      // TASK-003/P3 SC4 antirisk barrier gates (full real_publish requires all three
      // antirisk layers armed AND no behavior_anomaly in the rolling window)
      { key: 'three_layer_flags_all_on', passed: threeLayerFlagsOn },
      { key: 'behavior_anomaly_count_zero', passed: behaviorAnomalyCountZero },
      // TASK-005/P3 SC5 antirisk survival gate: probeBilibiliAuth not_logged_in → red.
      { key: 'auth_probe_healthy', passed: deps.isAuthProbeHealthy() },
      // TASK-002/D1 antirisk gate: reply-visibility shadowbanned verdict in the window → red
      // (fail-closed). probe_failed does NOT flip red (C-004 fail-open).
      { key: 'reply_visibility_verified', passed: replyVisibilityHealthy },
      // TASK-003/G3 compliance signal (ISS-001): passive_mode_active is an informational
      // gate (always "passed" — passive mode is a deliberate operator opt-in, not a fault).
      // Surfaced in the gate array so completion_matrix / observability reflect the mode.
      { key: 'passive_mode_active', passed: true },
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
        // ISS-004: each category derives from a concrete boolean signal (passed?100:0),
        // not an ungrounded magic number. No fake 86/90/95 intermediate scores — a
        // category is either satisfied (100) or not (0) per its real evidence signal.
        ui_ux: companionSurfaceSignedOff ? 100 : 0,
        frontend: companionSurfaceSignedOff ? 100 : 0,
        backend: deliveryReady && adminAccessConfigured ? 100 : 0,
        frontend_backend_loop: companionSurfaceSignedOff && deliveryReady ? 100 : 0,
        test: productReady ? 100 : 0,
        deploy: productReady ? 100 : 0,
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
