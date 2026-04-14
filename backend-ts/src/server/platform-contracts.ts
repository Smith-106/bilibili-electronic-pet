export const PLATFORM_NAMES = ['bilibili', 'qq', 'douyin', 'kuaishou'] as const;

export type PlatformName = (typeof PLATFORM_NAMES)[number];

export type PlatformCapabilityStatus = 'available' | 'partial' | 'disabled' | 'unsupported' | 'planned';

export type PlatformCapabilityDescriptor = {
  key: string;
  status: PlatformCapabilityStatus;
  note?: string;
};

export type PlatformConnectionSnapshot = {
  platform: PlatformName;
  enabled: boolean;
  adapterKey: string;
  status: 'connected' | 'degraded' | 'disconnected' | 'unknown';
  lastCheckedAt?: string | null;
  lastError?: string | null;
  capabilities: PlatformCapabilityDescriptor[];
  rolloutControl?: {
    enabled: boolean;
    stage: 'trial' | 'paused';
    updatedAt?: string | null;
  };
};

export type PlatformIdentityBinding = {
  platform: PlatformName;
  subjectType: string;
  subjectId: string;
  externalId: string;
  displayName?: string | null;
};

export type PlatformIngressEnvelope = {
  platform: PlatformName;
  source: string;
  traceId?: string;
  canonicalCommentId?: string;
  payload: Record<string, unknown>;
};

export type PlatformPublishEnvelope = {
  platform: PlatformName;
  commentId: string;
  replyText: string;
  forcePublish: boolean;
  traceId: string;
};

export type PlatformPublishOutcome = {
  published: boolean;
  reason: string;
  publishedAt?: string | null;
};

export type PlatformAdapterContract = {
  platform: PlatformName;
  adapterKey: string;
  supportsInboundEvents: boolean;
  supportsPublishing: boolean;
  supportsIdentityBinding: boolean;
  supportsConnectionHealth: boolean;
};

export function isPlatformName(value: string): value is PlatformName {
  return PLATFORM_NAMES.includes(value as PlatformName);
}
