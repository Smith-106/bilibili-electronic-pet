import type { FastifyInstance } from 'fastify';

import type { CompanionState } from '../server/contracts.js';

export type CompanionRouteDependencies = {
  getCompanionState: () => Promise<CompanionState> | CompanionState;
};

export function registerCompanionRoutes(app: FastifyInstance, deps: CompanionRouteDependencies): void {
  app.get('/companion/state', async () => deps.getCompanionState());
}
