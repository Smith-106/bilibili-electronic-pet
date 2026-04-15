import type { FastifyInstance, FastifyReply } from 'fastify';

async function serveStaticAsset(
  reply: FastifyReply,
  surface: 'admin' | 'companion',
  relativePath: string,
) {
  const fs = await import('fs/promises');
  const path = await import('path');
  const assetPath = path.join(process.cwd(), 'public', surface, ...relativePath.split('/').filter(Boolean));
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

async function serveStaticIndex(reply: FastifyReply, surface: 'admin' | 'companion', notFoundMessage: string) {
  const fs = await import('fs/promises');
  const path = await import('path');
  const indexPath = path.join(process.cwd(), 'public', surface, 'index.html');
  try {
    const html = await fs.readFile(indexPath, 'utf-8');
    return reply.type('text/html').send(html);
  } catch {
    return reply.code(404).send({ error: notFoundMessage });
  }
}

export function registerAdminStaticRoutes(app: FastifyInstance): void {
  app.get('/admin', async (_request, reply) => {
    return serveStaticIndex(reply, 'admin', 'Admin SPA not found');
  });

  app.get('/admin/assets/*', async (request, reply) =>
    serveStaticAsset(reply, 'admin', `assets/${(request.params as Record<string, string>)['*']}`),
  );

  app.get('/assets/*', async (request, reply) =>
    serveStaticAsset(reply, 'admin', `assets/${(request.params as Record<string, string>)['*']}`),
  );

  app.get('/static/admin/*', async (request, reply) => {
    const relativePath = (request.params as Record<string, string>)['*'];
    return serveStaticAsset(reply, 'admin', relativePath);
  });

  app.get('/companion', async (_request, reply) => {
    return serveStaticIndex(reply, 'companion', 'Companion SPA not found');
  });

  app.get('/companion/', async (_request, reply) => {
    return serveStaticIndex(reply, 'companion', 'Companion SPA not found');
  });

  app.get('/companion/assets/*', async (request, reply) =>
    serveStaticAsset(reply, 'companion', `assets/${(request.params as Record<string, string>)['*']}`),
  );

  app.get('/static/companion/*', async (request, reply) => {
    const relativePath = (request.params as Record<string, string>)['*'];
    return serveStaticAsset(reply, 'companion', relativePath);
  });
}
