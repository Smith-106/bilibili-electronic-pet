export type InteractionSubjectKind = 'comment' | 'message' | 'event';

export type InteractionActor = {
  platformUserId?: string;
};

export type InteractionReference = {
  subjectKind: InteractionSubjectKind;
  externalId: string;
  canonicalId: string;
  containerId?: string;
  parentExternalId?: string;
};

export type InteractionContent = {
  text?: string;
};

export type LegacyCommentReference = {
  commentId: string;
  videoId?: string;
  parentId?: string;
};

export type InteractionEvent = {
  platform: string;
  ingressSource: string;
  traceId?: string;
  actor?: InteractionActor;
  reference: InteractionReference;
  content: InteractionContent;
  legacyComment?: LegacyCommentReference;
};
