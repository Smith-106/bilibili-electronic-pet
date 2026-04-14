export type PublishTargetKind = 'comment-reply' | 'message';

export type PublishTarget = {
  platform: string;
  targetKind: PublishTargetKind;
  externalId: string;
  canonicalId: string;
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
