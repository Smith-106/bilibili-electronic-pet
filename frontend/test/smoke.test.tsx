import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../src/components/providers/theme-provider'
import { AuthProvider } from '../src/components/providers/auth-provider'
import { LoginPage } from '../src/pages/login-page'
import { AuditPage } from '../src/pages/audit-page'
import { DailyMetricsPage } from '../src/pages/daily-metrics-page'
import { KnowledgePage } from '../src/pages/knowledge-page'
import { ProfilesPage } from '../src/pages/profiles-page'
import { QueryPage } from '../src/pages/query-page'
import { GatewayPage } from '../src/pages/gateway-page'

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
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

describe('React pages smoke test', () => {
  it('renders LoginPage with API key input', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Bili Pet 管理面板')).toBeTruthy()
    expect(screen.getByLabelText('API Key')).toBeTruthy()
  })

  it('renders AuditPage skeleton', () => {
    const { container } = renderWithProviders(<AuditPage />)
    expect(container.querySelector('.space-y-6')).toBeTruthy()
  })

  it('renders DailyMetricsPage skeleton', () => {
    const { container } = renderWithProviders(<DailyMetricsPage />)
    expect(container.querySelector('.space-y-6')).toBeTruthy()
  })

  it('renders KnowledgePage skeleton', () => {
    const { container } = renderWithProviders(<KnowledgePage />)
    expect(container.querySelector('.space-y-6')).toBeTruthy()
  })

  it('renders ProfilesPage skeleton', () => {
    const { container } = renderWithProviders(<ProfilesPage />)
    expect(container.querySelector('.space-y-6')).toBeTruthy()
  })

  it('renders QueryPage skeleton', () => {
    const { container } = renderWithProviders(<QueryPage />)
    expect(container.querySelector('.space-y-6')).toBeTruthy()
  })

  it('renders GatewayPage skeleton', () => {
    const { container } = renderWithProviders(<GatewayPage />)
    expect(container.querySelector('.space-y-6')).toBeTruthy()
  })
})
