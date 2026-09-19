import type { FastifyInstance } from 'fastify';

import type { AdminManagementRouteDependencies } from './admin-management/deps.js';
import { registerKnowledgeRoutes } from './admin-management/knowledge.js';
import { registerMemoryRoutes } from './admin-management/memory.js';
import { registerProfileRoutes } from './admin-management/profiles.js';
import { registerRoleCardRoutes } from './admin-management/role-cards.js';

// ── Public re-exports (backward compatibility) ─────────────
export type { AdminManagementRouteDependencies };

/**
 * Register the admin-management route group. Split by domain into
 * routes/admin-management/ (knowledge / memory / profiles / role-cards); this
 * function is the single registration orchestrator, public API unchanged.
 */
export function registerAdminManagementRoutes(app: FastifyInstance, deps: AdminManagementRouteDependencies): void {
  registerKnowledgeRoutes(app, deps);
  registerMemoryRoutes(app, deps);
  registerProfileRoutes(app, deps);
  registerRoleCardRoutes(app, deps);
}
