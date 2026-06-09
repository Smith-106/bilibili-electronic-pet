import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerAdminStaticRoutes } from '../src/routes/admin-static.js';

let previousCwd: string;
let tempDir: string;

function writePublicFile(relativePath: string, content: string): void {
  const path = join(tempDir, 'public', ...relativePath.split('/'));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

describe('admin static route coverage', () => {
  beforeEach(() => {
    previousCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), 'bili-pet-static-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('serves companion slash index, static aliases, and binary fallback content type', async () => {
    writePublicFile('companion/index.html', '<main>Companion Shell</main>');
    writePublicFile('companion/assets/app.js', 'window.__companion = true;');
    writePublicFile('admin/assets/app.css', 'body { color: red; }');
    writePublicFile('admin/assets/payload.bin', 'raw-bytes');

    const app = Fastify();
    registerAdminStaticRoutes(app);

    const companionIndex = await app.inject({ method: 'GET', url: '/companion/' });
    const companionScript = await app.inject({ method: 'GET', url: '/static/companion/assets/app.js' });
    const companionAssetAlias = await app.inject({ method: 'GET', url: '/companion/assets/app.js' });
    const adminStylesheet = await app.inject({ method: 'GET', url: '/static/admin/assets/app.css' });
    const binaryAsset = await app.inject({ method: 'GET', url: '/admin/assets/payload.bin' });

    expect(companionIndex.statusCode).toBe(200);
    expect(companionIndex.headers['content-type']).toContain('text/html');
    expect(companionIndex.body).toContain('Companion Shell');
    expect(companionScript.statusCode).toBe(200);
    expect(companionScript.headers['content-type']).toContain('application/javascript');
    expect(companionScript.body).toBe('window.__companion = true;');
    expect(companionAssetAlias.statusCode).toBe(200);
    expect(companionAssetAlias.headers['content-type']).toContain('application/javascript');
    expect(companionAssetAlias.body).toBe('window.__companion = true;');
    expect(adminStylesheet.statusCode).toBe(200);
    expect(adminStylesheet.headers['content-type']).toContain('text/css');
    expect(adminStylesheet.body).toBe('body { color: red; }');
    expect(binaryAsset.statusCode).toBe(200);
    expect(binaryAsset.headers['content-type']).toContain('application/octet-stream');
    expect(binaryAsset.body).toBe('raw-bytes');

    await app.close();
  });

  it('returns surface-specific 404 payloads for missing indexes and assets', async () => {
    const app = Fastify();
    registerAdminStaticRoutes(app);

    const missingAdmin = await app.inject({ method: 'GET', url: '/admin' });
    const missingCompanion = await app.inject({ method: 'GET', url: '/companion' });
    const missingAsset = await app.inject({ method: 'GET', url: '/assets/missing.css' });

    expect(missingAdmin.statusCode).toBe(404);
    expect(missingAdmin.json()).toEqual({ error: 'Admin SPA not found' });
    expect(missingCompanion.statusCode).toBe(404);
    expect(missingCompanion.json()).toEqual({ error: 'Companion SPA not found' });
    expect(missingAsset.statusCode).toBe(404);
    expect(missingAsset.json()).toEqual({ error: 'Asset not found' });

    await app.close();
  });
});
