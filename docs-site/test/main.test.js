import { beforeEach, describe, expect, it } from 'vitest';

describe('docs site', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('renders the documentation surface with release, architecture, and platform sections', async () => {
    await import('../src/main.js?case=with-root');

    expect(document.querySelector('.site-header')).not.toBeNull();
    expect(document.querySelector('h1')?.textContent).toContain('runtime boundaries');
    expect(document.querySelector('#architecture')?.textContent).toContain('Fastify API');
    expect(document.querySelector('#platforms')?.textContent).toContain('Bilibili');
    expect(document.querySelector('#deploy')?.textContent).toContain('Release and deployment runbook');
    expect(document.querySelector('footer')?.textContent).toContain('Docs release v1.2.1');
  });

  it('does not throw when the app root is absent', async () => {
    document.body.innerHTML = '';

    await expect(import('../src/main.js?case=without-root')).resolves.toBeTruthy();
  });
});
