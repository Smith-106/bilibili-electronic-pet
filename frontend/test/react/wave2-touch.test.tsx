import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Input } from '../../src/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../src/components/ui/select'

describe('Wave 2 / Theme A — Input 触摸目标 44px (H-01 / DD-2)', () => {
  it('Input 使用 h-11（44px）高度令牌', () => {
    const { container } = render(<Input placeholder="测试" />)
    const input = container.querySelector('input')
    expect(input).toBeTruthy()
    expect(input?.className).toContain('h-11')
    // 不应残留旧的 h-10
    expect(input?.className).not.toMatch(/\bh-10\b/)
  })

  it('Input 保留 data-slot="input" 与焦点环令牌组', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input')
    expect(input?.getAttribute('data-slot')).toBe('input')
    expect(input?.className).toContain('focus-visible:border-ring')
    expect(input?.className).toContain('focus-visible:ring-[3px]')
    expect(input?.className).toContain('focus-visible:ring-ring')
  })
})

describe('Wave 2 / Theme A — SelectTrigger 触摸目标 (H-01 / DD-1)', () => {
  function renderTrigger(size?: 'default' | 'sm') {
    return render(
      <Select>
        <SelectTrigger size={size} aria-label="选择器">
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">选项 A</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  it('default 尺寸使用 min-h-11（44px，min-h 允许长选项撑高不裁切）', () => {
    const { container } = renderTrigger('default')
    const trigger = container.querySelector('[data-slot="select-trigger"]')
    expect(trigger).toBeTruthy()
    expect(trigger?.className).toContain('data-[size=default]:min-h-11')
    // 不应残留旧的固定高度类（min-h-10 是 sm 变体，属合法存在）
    expect(trigger?.className).not.toContain('data-[size=default]:h-10')
  })

  it('sm 尺寸使用 min-h-10（40px）', () => {
    const { container } = renderTrigger('sm')
    const trigger = container.querySelector('[data-slot="select-trigger"]')
    expect(trigger?.className).toContain('data-[size=sm]:min-h-10')
    expect(trigger?.className).not.toContain('data-[size=sm]:h-9')
  })

  it('E-6/E-7 回归：Wave 2 高度修改后 Radix data 属性完整（data-slot / data-size）', () => {
    const { container } = renderTrigger('default')
    const trigger = container.querySelector('[data-slot="select-trigger"]')
    expect(trigger).toBeTruthy()
    expect(trigger?.getAttribute('data-slot')).toBe('select-trigger')
    expect(trigger?.getAttribute('data-size')).toBe('default')
    // Radix Trigger 渲染为 <button>，可被键盘操作
    expect(trigger?.tagName).toBe('BUTTON')
  })

  it('E-6/E-7 回归：sm 尺寸 data-size 属性正确', () => {
    const { container } = renderTrigger('sm')
    const trigger = container.querySelector('[data-slot="select-trigger"]')
    expect(trigger?.getAttribute('data-size')).toBe('sm')
  })

  it('SelectTrigger 保留焦点环令牌组（focus-visible 一致性）', () => {
    const { container } = renderTrigger('default')
    const trigger = container.querySelector('[data-slot="select-trigger"]')
    expect(trigger?.className).toContain('focus-visible:border-ring')
    expect(trigger?.className).toContain('focus-visible:ring-[3px]')
    expect(trigger?.className).toContain('focus-visible:ring-ring')
  })
})
