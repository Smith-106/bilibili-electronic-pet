import type { FastifyInstance } from 'fastify';

import type { CompanionState } from '../server/contracts.js';

export type CompanionRouteDependencies = {
  getCompanionState: () => Promise<CompanionState> | CompanionState;
  recordCompanionAction: (input: {
    action: 'pat' | 'feed' | 'wake';
    note?: string;
  }) => Promise<{ ok: boolean; action: string; item_key: string }> | { ok: boolean; action: string; item_key: string };
};

export function registerCompanionRoutes(app: FastifyInstance, deps: CompanionRouteDependencies): void {
  app.get('/companion/state', async () => deps.getCompanionState());

  app.post('/companion/actions', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const action = String(body.action ?? '').trim().toLowerCase();
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 256) : undefined;

    if (!['pat', 'feed', 'wake'].includes(action)) {
      return reply.code(400).send({ detail: 'action_invalid' });
    }

    const response = await deps.recordCompanionAction({
      action: action as 'pat' | 'feed' | 'wake',
      note,
    });
    return reply.send(response);
  });
}
