export type PublishTargetKind = 'comment-reply' | 'message';

export type PublishTargetRoute = {
  containerId?: string;
  parentExternalId?: string;
  metadata?: Record<string, string>;
};

export type PublishTarget = {
  platform: string;
  targetKind: PublishTargetKind;
  externalId: string;
  canonicalId: string;
  route?: PublishTargetRoute;
};

export type PublishPayload = {
  text: string;
};

export type PublishIntent = {
  traceId?: string;
  source?: string;
  target: PublishTarget;
  payload: PublishPayload;
};
