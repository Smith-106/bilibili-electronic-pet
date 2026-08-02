import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../../src/components/providers/theme-provider'
import { AuthProvider } from '../../src/components/providers/auth-provider'
import { BilibiliPage } from '../../src/pages/bilibili-page'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderPage() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <BilibiliPage />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

const SENSITIVE_FIELDS = ['SESSDATA', 'bili_jct', 'buvid3', 'buvid4'] as const

describe('Wave 5 — 凭证密文化 (M-06)', () => {
  it('四个敏感凭证输入框默认 type="password"', () => {
    renderPage()
    for (const field of SENSITIVE_FIELDS) {
      const input = screen.getByLabelText(field) as HTMLInputElement
      expect(input.type, `${field} 应默认密文`).toBe('password')
    }
  })

  it('敏感凭证输入框均设置 autoComplete="off"', () => {
    renderPage()
    for (const field of SENSITIVE_FIELDS) {
      const input = screen.getByLabelText(field) as HTMLInputElement
      expect(input.getAttribute('autoComplete'), `${field} 应关闭自动补全`).toBe('off')
    }
  })

  it('非敏感字段保持可见：名称为 text，过期时间为 datetime-local', () => {
    renderPage()
    const name = screen.getByLabelText('名称') as HTMLInputElement
    expect(name.type).toBe('text')
    const expires = screen.getByLabelText('过期时间') as HTMLInputElement
    expect(expires.type).toBe('datetime-local')
  })

  it('存在可见性切换按钮，初始 aria-label="显示凭证值" 且 aria-pressed="false"', () => {
    renderPage()
    const toggle = screen.getByRole('button', { name: '显示凭证值' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
  })

  it('点击切换按钮 → 敏感输入框变为 type="text"，按钮语义翻转', () => {
    renderPage()
    const toggle = screen.getByRole('button', { name: '显示凭证值' })
    fireEvent.click(toggle)

    for (const field of SENSITIVE_FIELDS) {
      const input = screen.getByLabelText(field) as HTMLInputElement
      expect(input.type, `${field} 切换后应明文`).toBe('text')
    }

    // 按钮翻转为"隐藏凭证值"，aria-pressed=true
    const toggled = screen.getByRole('button', { name: '隐藏凭证值' })
    expect(toggled.getAttribute('aria-pressed')).toBe('true')
  })

  it('再次点击切换按钮 → 恢复密文（状态可逆）', () => {
    renderPage()
    const toggle = screen.getByRole('button', { name: '显示凭证值' })
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: '隐藏凭证值' }))

    for (const field of SENSITIVE_FIELDS) {
      const input = screen.getByLabelText(field) as HTMLInputElement
      expect(input.type).toBe('password')
    }
  })
})
