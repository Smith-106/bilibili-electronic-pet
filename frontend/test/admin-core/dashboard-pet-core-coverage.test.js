import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getOverview: vi.fn(),
    getJobs: vi.fn(),
    getGatewayLogs: vi.fn(),
    getAuditSummary: vi.fn(),
    getMetricsOverview: vi.fn(),
    getObservabilitySummary: vi.fn(),
    getReadinessStatus: vi.fn(),
    getPetOverview: vi.fn(),
    recordPetAction: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../src/api/admin.js', () => ({
  createAdminApi: () => mockApi,
}));

vi.mock('../../src/components/toast.js', () => ({
  showToast: mockShowToast,
}));

const [{ render: renderDashboard }, { render: renderPetCore }] = await Promise.all([
  import('../../src/pages/dashboard.js'),
  import('../../src/pages/pet-core.js'),
]);

function resetMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();

  mockApi.getOverview.mockResolvedValue({});
  mockApi.getJobs.mockResolvedValue({ items: [] });
  mockApi.getGatewayLogs.mockResolvedValue({ items: [] });
  mockApi.getAuditSummary.mockResolvedValue({});
  mockApi.getMetricsOverview.mockResolvedValue({});
  mockApi.getObservabilitySummary.mockResolvedValue({});
  mockApi.getReadinessStatus.mockResolvedValue({});
  mockApi.getPetOverview.mockResolvedValue({
    item: {
      snapshot: {
        relationship: { level: 'Growing', note: 'Bond note' },
        progress: { progressLabel: 'Settling', nextMilestone: 'Daily ritual' },
        needs: [{ key: 'energy', label: 'Energy', value: '80%' }],
        proactiveSignals: [{ key: 'snack', label: 'Snack', detail: 'Feed soon' }],
      },
      companion: {
        petName: 'Mochi',
        loopMode: 'core',
        adapterLabel: 'api',
        statusLine: 'ready',
        recentInteractions: [
          { title: 'Pat', detail: 'Gentle pat', source: 'pet-core', timestamp: '2026-04-07T00:00:00.000Z' },
        ],
      },
    },
  });
  mockApi.recordPetAction.mockResolvedValue({ ok: true });
}

describe('dashboard and pet-core coverage branches', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('renders dashboard fallback values, nested observability entries, and refreshes', async () => {
    const container = createPageContainer();
    mockApi.getOverview.mockResolvedValueOnce({
      total_comments: null,
      total_jobs: 0,
      total_published: undefined,
      pending_review: 3,
      total_failed: 1,
    });
    mockApi.getJobs.mockResolvedValueOnce({
      items: [
        {
          status: 'failed',
          route_context: null,
        },
      ],
    });
    mockApi.getGatewayLogs.mockResolvedValueOnce({ items: [{ id: 1 }, { id: 2 }] });
    mockApi.getMetricsOverview.mockResolvedValueOnce({
      llm_provider: '',
      searchProvider: 'bing',
      publisherMode: 'trial',
      llm_api_key_configured: false,
      search_api_key_configured: true,
      publisher_webhook_url_configured: false,
      bilibiliEnabled: false,
      bilibiliPublishEnabled: true,
      killSwitch: true,
      boolean_probe: false,
    });
    mockApi.getObservabilitySummary.mockResolvedValueOnce({
      ok: false,
      summary: {
        nested: {
          latencyMs: 42,
          empty: '',
          missing: null,
        },
        tags: ['a', 'b'],
        emptyTags: [],
      },
    });

    await renderDashboard(container);

    expect(container.textContent).toContain('bing');
    expect(container.textContent).toContain('trial');
    expect(container.textContent).toContain('nested latency Ms');
    expect(container.textContent).toContain('2 项');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);

    mockApi.getOverview.mockResolvedValueOnce({});
    mockApi.getJobs.mockResolvedValueOnce({ items: [] });
    mockApi.getGatewayLogs.mockResolvedValueOnce({ items: [] });
    mockApi.getAuditSummary.mockResolvedValueOnce({});
    mockApi.getMetricsOverview.mockResolvedValueOnce({});
    mockApi.getObservabilitySummary.mockResolvedValueOnce({});
    mockApi.getReadinessStatus.mockResolvedValueOnce({});
    container.querySelector('#dashboard-refresh').click();
    await flushPromises();

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'info');
    expect(mockApi.getOverview).toHaveBeenCalledTimes(2);
  });

  it('uses readiness fallback signals and dashboard empty states', async () => {
    const container = createPageContainer();
    mockApi.getReadinessStatus.mockResolvedValueOnce({
      foundation_ready: false,
      delivery_ready: false,
      foundation_blockers: ['db'],
      delivery_blockers: [],
      delivery_capability_blockers: ['publish', 'search'],
      delivery_signals: { effective_publish_mode: 'manual_review' },
    });
    mockApi.getObservabilitySummary.mockResolvedValueOnce({ ok: true, summary: {} });

    await renderDashboard(container);

    expect(container.textContent).toContain('manual_review');
    expect(container.textContent).toContain('1 项');
    expect(container.textContent).toContain('2 项');
    expect(container.querySelector('.table-empty-cell')).toBeTruthy();
  });

  it('handles per-widget dashboard api failures and outer render failures', async () => {
    const container = createPageContainer();
    mockApi.getOverview.mockRejectedValueOnce(new Error('overview down'));
    mockApi.getJobs.mockRejectedValueOnce(new Error('jobs down'));
    mockApi.getGatewayLogs.mockRejectedValueOnce(new Error('gateway down'));
    mockApi.getAuditSummary.mockRejectedValueOnce(new Error('audit down'));
    mockApi.getMetricsOverview.mockRejectedValueOnce(new Error('metrics down'));
    mockApi.getObservabilitySummary.mockRejectedValueOnce(new Error('obs down'));
    mockApi.getReadinessStatus.mockRejectedValueOnce(new Error('readiness down'));

    await renderDashboard(container);

    expect(container.querySelector('.table-empty-cell')).toBeTruthy();
    expect(container.textContent).toContain('0');

    mockApi.getOverview.mockImplementationOnce(() => {
      throw new Error('sync down');
    });
    await renderDashboard(container);

    expect(container.querySelector('.page-error').textContent).toContain('sync down');
  });

  it('renders pet-core empty and fallback fields', async () => {
    const container = createPageContainer();
    mockApi.getPetOverview.mockResolvedValueOnce({ item: { snapshot: {}, companion: {} } });

    await renderPetCore(container);

    expect(container.querySelector('#pet-needs .table-empty')).toBeTruthy();
    expect(container.querySelector('#pet-signals .table-empty')).toBeTruthy();
    expect(container.querySelector('#pet-timeline .table-empty')).toBeTruthy();
    expect(container.textContent).toContain('暂无下一阶段里程碑');
  });

  it('renders pet-core response and need label fallbacks', async () => {
    const nullContainer = createPageContainer();
    mockApi.getPetOverview.mockResolvedValueOnce(null);

    await renderPetCore(nullContainer);

    expect(nullContainer.querySelector('#pet-needs .table-empty')).toBeTruthy();
    expect(nullContainer.textContent).toContain('-');

    const fallbackContainer = createPageContainer();
    mockApi.getPetOverview.mockResolvedValueOnce({
      item: {
        snapshot: {
          needs: [{ value: 'no-label' }],
        },
        companion: null,
      },
    });

    await renderPetCore(fallbackContainer);

    expect(fallbackContainer.textContent).toContain('Need');
    expect(fallbackContainer.textContent).toContain('no-label');
  });

  it('renders pet-core item fallback labels and records an action without a note', async () => {
    const container = createPageContainer();
    mockApi.getPetOverview.mockResolvedValue({
      item: {
        snapshot: {
          relationship: {},
          progress: {},
          needs: [{ key: 'hunger' }, { label: 'Mood', value: '' }],
          proactiveSignals: [{ key: 'signal-key' }, { detail: '' }],
        },
        companion: {
          recentInteractions: [{ kind: 'wake' }, { detail: '', timestamp: '' }],
        },
      },
    });

    await renderPetCore(container);
    expect(container.textContent).toContain('hunger');
    expect(container.textContent).toContain('Mood');
    expect(container.textContent).toContain('signal-key');

    container.querySelector('[data-action="pat"]').click();
    await flushPromises();
    await flushPromises();

    expect(mockApi.recordPetAction).toHaveBeenCalledWith('pat', undefined);
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    container.querySelector('#pet-refresh').click();
    await flushPromises();
    expect(mockApi.getPetOverview).toHaveBeenCalledTimes(3);
  });

  it('records pet-core actions with trimmed notes and falls back to action keys', async () => {
    const container = createPageContainer();

    await renderPetCore(container);

    const note = `${'x'.repeat(170)}   `;
    container.querySelector('#pet-action-note').value = note;
    container.querySelector('[data-action="feed"]').click();
    await flushPromises();
    await flushPromises();

    expect(mockApi.recordPetAction).toHaveBeenCalledWith('feed', 'x'.repeat(160));
    expect(container.querySelector('#pet-action-note').value).toBe('');

    const wakeButton = container.querySelector('[data-action="wake"]');
    wakeButton.removeAttribute('data-action-label');
    wakeButton.textContent = '';
    wakeButton.click();
    await flushPromises();

    expect(mockApi.recordPetAction).toHaveBeenLastCalledWith('wake', undefined);
    expect(container.querySelector('#pet-action-status').textContent).toContain('wake');

    Object.defineProperty(container.querySelector('#pet-action-note'), 'value', {
      value: null,
      configurable: true,
    });
    container.querySelector('[data-action="pat"]').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.recordPetAction).toHaveBeenLastCalledWith('pat', undefined);
  });

  it('reports pet-core action and load failures', async () => {
    const container = createPageContainer();

    await renderPetCore(container);
    mockApi.recordPetAction.mockRejectedValueOnce('bad-action');
    container.querySelector('[data-action="wake"]').click();
    await flushPromises();

    expect(container.querySelector('#pet-action-status').textContent).toContain('unknown_error');
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('unknown_error'), 'error');

  });

  it('surfaces initial pet-core load errors for all panels', async () => {
    const container = createPageContainer();
    mockApi.getPetOverview.mockRejectedValueOnce('initial bad');

    await expect(renderPetCore(container)).rejects.toBe('initial bad');

    expect(container.querySelectorAll('.page-error')).toHaveLength(5);
    expect(container.textContent).toContain('unknown_error');
  });
});
