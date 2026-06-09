import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { getPrisma } from '../lib/prisma.js';
import type { ReplyJob, RuntimeSettings } from '../server/contracts.js';
import { buildCommentRouteContext } from '../server/comment-job-queries.js';

export type CommentRoutesDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  getComment: (input: {
    commentId: string;
  }) =>
    | Promise<{ ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] }>
    | { ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] };
};

export function registerCommentRoutes(app: FastifyInstance, deps: CommentRoutesDependencies): void {
  app.get('/comments', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const limit = deps.parseAdminLimit(query.limit, 50, 1, 500);
    const offset = deps.parseAdminOffset(query.offset, 0, 0, 100000);
    const prisma = getPrisma();
    const [total, items] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.findMany({ orderBy: { created_at: 'desc' }, skip: offset, take: limit }),
    ]);
    return reply.send({
      ok: true,
      total,
      items: items.map((item) => ({
        ...item,
        route_context: buildCommentRouteContext({
          platform: item.platform,
          videoId: item.video_id,
          userId: item.user_id,
          parentId: item.parent_id,
        }),
      })),
    });
  });

  const handleGetCommentRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const commentId = String(params.comment_id).trim();

    if (!commentId) {
      return reply.code(404).send({ detail: 'comment_not_found' });
    }

    const response = await deps.getComment({ commentId });
    return reply.send(response);
  };

  app.get('/comments/:comment_id', handleGetCommentRoute);
  app.get('/api/comments/:comment_id', handleGetCommentRoute);
}
