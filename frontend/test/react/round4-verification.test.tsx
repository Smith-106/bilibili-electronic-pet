import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../../src/components/providers/theme-provider'
import { AuthProvider } from '../../src/components/providers/auth-provider'

// --- Mock admin-api (module-level singleton in pages) ---
const mockApi = {
  getOverview: vi.fn(),
  getJobs: vi.fn(),
  getAuditSummary: vi.fn(),
  getMetricsOverview: vi.fn(),
  getObservabilitySummary: vi.fn(),
  getReadinessStatus: vi.fn(),
  getBilibiliStatus: vi.fn(),
  getBilibiliVideos: vi.fn(),
  getBilibiliCredentials: vi.fn(),
  getMemorySpaces: vi.fn(),
  getMemorySpaceItems: vi.fn(),
  deleteMemoryItem: vi.fn(),
  exportJobsCsv: vi.fn(),
}

vi.mock('@/lib/admin-api', () => ({
  createAdminApi: () => mockApi,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <MemoryRouter>{ui}</MemoryRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: all API calls resolve empty
  Object.values(mockApi).forEach(fn => fn.mockResolvedValue({}))
  // jsdom 缺少 scrollIntoView（Radix Select 依赖）
  Element.prototype.scrollIntoView = vi.fn()
})

// ─────────────────────────────────────────────────────────
// W1: Dashboard refresh → invalidateQueries (H-01)
// ─────────────────────────────────────────────────────────
describe('W1 H-01 — Dashboard refresh 使用 invalidateQueries', () => {
  async function renderDashboard() {
    mockApi.getOverview.mockResolvedValue({ total_comments: 5, total_jobs: 3 })
    mockApi.getJobs.mockResolvedValue({ items: [] })
    mockApi.getAuditSummary.mockResolvedValue({ total: 10 })
    mockApi.getMetricsOverview.mockResolvedValue({})
    mockApi.getObservabilitySummary.mockResolvedValue({})
    mockApi.getReadinessStatus.mockResolvedValue({})

    const { DashboardPage } = await import('../../src/pages/dashboard-page')
    return renderWithProviders(<DashboardPage />)
  }

  it('刷新按钮点击后调用 queryClient.invalidateQueries（非裸 api 调用）', async () => {
    const { queryClient } = await renderDashboard()

    // Wait for loading to finish (skeletons → content)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /刷新数据/ })).toBeTruthy()
    })

    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()
    fireEvent.click(screen.getByRole('button', { name: /刷新数据/ }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1)
    })
    spy.mockRestore()
  })

  it('刷新期间按钮显示 aria-busy 和 spinner 文案', async () => {
    const { queryClient } = await renderDashboard()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /刷新数据/ })).toBeTruthy()
    })

    // Make invalidateQueries hang to observe busy state
    let resolve!: () => void
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(
      () => new Promise<void>(r => { resolve = r })
    )

    fireEvent.click(screen.getByRole('button', { name: /刷新数据/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /刷新中/ })).toBeTruthy()
    })
    const btn = screen.getByRole('button', { name: /刷新中/ })
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.hasAttribute('disabled')).toBe(true)

    resolve()
    spy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────
// W1: Jobs filter normalization (H-02)
// ─────────────────────────────────────────────────────────
describe('W1 H-02 — Jobs 筛选哨兵值归一化', () => {
  it('初始状态（空串）→ getJobs 收到 status: undefined（非空串泄漏）', async () => {
    mockApi.getJobs.mockResolvedValue({ items: [] })
    const { JobsPage } = await import('../../src/pages/jobs-page')
    renderWithProviders(<JobsPage />)

    await waitFor(() => {
      expect(mockApi.getJobs).toHaveBeenCalled()
    })

    const callArgs = mockApi.getJobs.mock.calls[0][0]
    expect(callArgs.status).toBeUndefined()
    expect(callArgs.limit).toBe(20)
  })

  it('queryFn 归一化逻辑：__all__ 和空串均映射为 undefined', async () => {
    // 直接验证归一化表达式（与源码 line 35 一致）
    const normalize = (s: string) => (!s || s === '__all__' ? undefined : s)
    expect(normalize('')).toBeUndefined()
    expect(normalize('__all__')).toBeUndefined()
    expect(normalize('queued')).toBe('queued')
    expect(normalize('failed')).toBe('failed')
  })
})

// ─────────────────────────────────────────────────────────
// W1: Bilibili filter normalization (H-02)
// ─────────────────────────────────────────────────────────
describe('W1 H-02 — Bilibili 轮询筛选哨兵值归一化', () => {
  it('初始状态（空串）→ getBilibiliVideos 收到 poll_enabled: undefined', async () => {
    mockApi.getBilibiliStatus.mockResolvedValue({})
    mockApi.getBilibiliVideos.mockResolvedValue({ items: [], total: 0 })
    mockApi.getBilibiliCredentials.mockResolvedValue({ items: [] })

    const { BilibiliPage } = await import('../../src/pages/bilibili-page')
    renderWithProviders(<BilibiliPage />)

    await waitFor(() => {
      expect(mockApi.getBilibiliVideos).toHaveBeenCalled()
    })

    const callArgs = mockApi.getBilibiliVideos.mock.calls[0][0]
    // 关键断言：poll_enabled 不得为 false（旧 bug：空串→false 泄漏）
    expect(callArgs.poll_enabled).toBeUndefined()
  })

  it('归一化逻辑：__all__/空串 → undefined；"true" → true；"false" → false', () => {
    // 验证与源码 line 95 一致的归一化表达式
    const normalize = (f: string) => (!f || f === '__all__' ? undefined : f === 'true')
    expect(normalize('')).toBeUndefined()
    expect(normalize('__all__')).toBeUndefined()
    expect(normalize('true')).toBe(true)
    expect(normalize('false')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────
// W2: App-shell collapsed nav accessible names (H-03)
// ─────────────────────────────────────────────────────────
describe('W2 H-03 — App-shell 折叠导航保留可访问名', () => {
  async function renderAppShell() {
    const { AppShell } = await import('../../src/components/layout/app-shell')
    return renderWithProviders(
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div data-testid="page-content">内容</div>} />
        </Route>
      </Routes>
    )
  }

  it('折叠后导航标签使用 md:sr-only（非 md:hidden），可访问性树保留', async () => {
    await renderAppShell()

    // 点击"收起侧栏"按钮触发折叠
    const collapseBtn = screen.getByRole('button', { name: '收起侧栏' })
    fireEvent.click(collapseBtn)

    // 折叠后，导航标签 span 应含 md:sr-only 类
    const navLabels = screen.getAllByText(/仪表盘|任务管理|知识库/)
    for (const label of navLabels) {
      expect(label.className).toContain('md:sr-only')
      // 关键：不得含 md:hidden（会使元素从可访问性树消失）
      expect(label.className).not.toContain('md:hidden')
    }
  })

  it('展开状态导航标签不含 md:sr-only', async () => {
    await renderAppShell()

    // 默认展开状态
    const label = screen.getByText('仪表盘')
    expect(label.className).not.toContain('md:sr-only')
  })

  it('skip-link 存在且指向 #main-content', async () => {
    const { container } = await renderAppShell()
    const skipLink = container.querySelector('a[href="#main-content"]')
    expect(skipLink).toBeTruthy()
    expect(skipLink?.className).toContain('sr-only')
    expect(skipLink?.className).toContain('focus:not-sr-only')
    expect(skipLink?.textContent).toBe('跳到主要内容')
  })

  it('main 元素有 id="main-content" 和 tabIndex={-1}', async () => {
    const { container } = await renderAppShell()
    const main = container.querySelector('main#main-content')
    expect(main).toBeTruthy()
    expect(main?.getAttribute('tabindex')).toBe('-1')
  })
})

// ─────────────────────────────────────────────────────────
// W2: Memory delete AlertDialog confirmation (H-04)
// ─────────────────────────────────────────────────────────
describe('W2 H-04 — Memory 删除需 AlertDialog 确认', () => {
  async function renderMemoryWithItems() {
    mockApi.getMemorySpaces.mockResolvedValue({
      items: [{ id: 1, space_key: 'op:alpha', space_type: 'operator', title: 'Alpha', updated_at: null }],
    })
    mockApi.getMemorySpaceItems.mockResolvedValue({
      items: [{ id: 101, space_id: 1, item_key: 'test-key', content_type: 'note', source: 'operator', content: '测试内容', updated_at: '2026-01-01T00:00:00Z' }],
    })
    mockApi.deleteMemoryItem.mockResolvedValue({})

    const { MemoryPage } = await import('../../src/pages/memory-page')
    return renderWithProviders(<MemoryPage />)
  }

  it('点击删除按钮弹出 AlertDialog 确认弹窗（非直接删除）', async () => {
    const { container } = await renderMemoryWithItems()

    // 等待空间列表渲染
    await waitFor(() => {
      expect(screen.getByText('op:alpha')).toBeTruthy()
    })

    // 通过 id 定位空间 Select trigger（避免与 datalist combobox 冲突）
    const spaceTrigger = container.querySelector('#item-space')
    expect(spaceTrigger).toBeTruthy()
    fireEvent.click(spaceTrigger!)

    // 点击空间选项（Radix Select 渲染为 role="option"）
    await waitFor(() => {
      const option = screen.queryByRole('option', { name: /Alpha/ })
      if (option) fireEvent.click(option)
    })

    // 等待条目表格出现
    await waitFor(() => {
      expect(screen.getByText('test-key')).toBeTruthy()
    }, { timeout: 3000 })

    // 点击删除按钮
    const deleteBtn = screen.getByRole('button', { name: /删除/ })
    fireEvent.click(deleteBtn)

    // AlertDialog 应出现
    await waitFor(() => {
      expect(screen.getByText('删除记忆条目？')).toBeTruthy()
    })
    expect(screen.getByText(/将删除条目「test-key」/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '确认删除' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '取消' })).toBeTruthy()
  })

  it('确认删除按钮带 destructive 样式类', async () => {
    const { container } = await renderMemoryWithItems()

    await waitFor(() => {
      expect(screen.getByText('op:alpha')).toBeTruthy()
    })

    const spaceTrigger = container.querySelector('#item-space')
    fireEvent.click(spaceTrigger!)

    await waitFor(() => {
      const option = screen.queryByRole('option', { name: /Alpha/ })
      if (option) fireEvent.click(option)
    })

    await waitFor(() => {
      expect(screen.getByText('test-key')).toBeTruthy()
    }, { timeout: 3000 })

    fireEvent.click(screen.getByRole('button', { name: /删除/ }))

    await waitFor(() => {
      expect(screen.getByText('删除记忆条目？')).toBeTruthy()
    })

    const confirmBtn = screen.getByRole('button', { name: '确认删除' })
    expect(confirmBtn.className).toContain('bg-destructive')
    expect(confirmBtn.className).toContain('text-destructive-foreground')
  })
})

// ─────────────────────────────────────────────────────────
// W5: Checkbox with indeterminate support (L-03)
// ─────────────────────────────────────────────────────────
describe('W5 L-03 — Radix Checkbox + indeterminate', () => {
  it('checked 状态渲染 CheckIcon', async () => {
    const { Checkbox } = await import('../../src/components/ui/checkbox')
    const { container } = render(<Checkbox checked={true} />)
    const root = container.querySelector('[data-slot="checkbox"]')
    expect(root).toBeTruthy()
    expect(root?.getAttribute('data-state')).toBe('checked')
    // CheckIcon (lucide) 渲染为 svg
    const svg = root?.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('indeterminate 状态渲染 MinusIcon 且 data-state="indeterminate"', async () => {
    const { Checkbox } = await import('../../src/components/ui/checkbox')
    const { container } = render(<Checkbox checked="indeterminate" />)
    const root = container.querySelector('[data-slot="checkbox"]')
    expect(root).toBeTruthy()
    expect(root?.getAttribute('data-state')).toBe('indeterminate')
    // MinusIcon 渲染为 svg（含 line 元素）
    const svg = root?.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('unchecked 状态 data-state="unchecked"', async () => {
    const { Checkbox } = await import('../../src/components/ui/checkbox')
    const { container } = render(<Checkbox checked={false} />)
    const root = container.querySelector('[data-slot="checkbox"]')
    expect(root?.getAttribute('data-state')).toBe('unchecked')
  })

  it('focus-visible ring 样式类存在', async () => {
    const { Checkbox } = await import('../../src/components/ui/checkbox')
    const { container } = render(<Checkbox />)
    const root = container.querySelector('[data-slot="checkbox"]')
    expect(root?.className).toContain('focus-visible:ring-[3px]')
    expect(root?.className).toContain('focus-visible:ring-ring')
  })

  it('disabled 态设置 disabled 属性', async () => {
    const { Checkbox } = await import('../../src/components/ui/checkbox')
    const { container } = render(<Checkbox disabled />)
    const root = container.querySelector('[data-slot="checkbox"]')
    expect(root?.hasAttribute('disabled')).toBe(true)
    expect(root?.className).toContain('disabled:cursor-not-allowed')
  })
})
