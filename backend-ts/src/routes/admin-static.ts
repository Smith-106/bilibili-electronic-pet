import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

async function serveAdminAsset(request: FastifyRequest, reply: FastifyReply, relativePath: string) {
  const fs = await import('fs/promises');
  const path = await import('path');
  const assetPath = path.join(process.cwd(), 'public', 'admin', ...relativePath.split('/').filter(Boolean));
  try {
    const content = await fs.readFile(assetPath);
    if (assetPath.endsWith('.js')) {
      return reply.type('application/javascript').send(content);
    } else if (assetPath.endsWith('.css')) {
      return reply.type('text/css').send(content);
    } else {
      return reply.type('application/octet-stream').send(content);
    }
  } catch {
    return reply.code(404).send({ error: 'Asset not found' });
  }
}

export function registerAdminStaticRoutes(app: FastifyInstance): void {
  app.get('/admin', async (_request, reply) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const indexPath = path.join(process.cwd(), 'public', 'admin', 'index.html');
    try {
      const html = await fs.readFile(indexPath, 'utf-8');
      return reply.type('text/html').send(html);
    } catch {
      return reply.code(404).send({ error: 'Admin SPA not found' });
    }
  });

  app.get('/admin/assets/*', async (request, reply) =>
    serveAdminAsset(request, reply, `assets/${(request.params as Record<string, string>)['*']}`),
  );

  app.get('/assets/*', async (request, reply) =>
    serveAdminAsset(request, reply, `assets/${(request.params as Record<string, string>)['*']}`),
  );

  app.get('/static/admin/*', async (request, reply) => {
    const relativePath = (request.params as Record<string, string>)['*'];
    return serveAdminAsset(request, reply, relativePath);
  });
}
