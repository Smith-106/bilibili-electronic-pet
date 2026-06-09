import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { CompanionState, CompanionStateV2, RuntimeSettings } from '../server/contracts.js';
import { isPetActionName, type PetActionName } from '../server/pet-contracts.js';

export type CompanionRouteDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  getCompanionState: () => Promise<CompanionState> | CompanionState;
  getCompanionStateV2: () => Promise<CompanionStateV2> | CompanionStateV2;
  recordCompanionAction: (input: {
    action: PetActionName;
    note?: string;
  }) => Promise<{ ok: boolean; action: string; item_key: string }> | { ok: boolean; action: string; item_key: string };
};

function authorizeCompanionAction(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: CompanionRouteDependencies,
): boolean {
  if (deps.settings.publicCompanionActionsEnabled === true) {
    return true;
  }

  const hasAdminAccessConfigured = Boolean(
    deps.settings.apiKey?.trim() || deps.settings.adminSessionSecret?.trim(),
  );
  if (!hasAdminAccessConfigured) {
    void reply.code(503).send({ detail: 'companion_action_auth_unconfigured' });
    return false;
  }

  return deps.checkApiKey(request, reply, deps.settings);
}

export function registerCompanionRoutes(app: FastifyInstance, deps: CompanionRouteDependencies): void {
  app.get('/companion/state', async () => deps.getCompanionState());
  app.get('/companion/state-v2', async () => deps.getCompanionStateV2());

  app.post('/companion/actions', async (request, reply) => {
    if (!authorizeCompanionAction(request, reply, deps)) return;

    const body = request.body as Record<string, unknown>;
    const action = String(body.action ?? '').trim().toLowerCase();
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 256) : undefined;

    if (!isPetActionName(action)) {
      return reply.code(400).send({ detail: 'action_invalid' });
    }

    const response = await deps.recordCompanionAction({
      action,
      note,
    });
    return reply.send(response);
  });
}
