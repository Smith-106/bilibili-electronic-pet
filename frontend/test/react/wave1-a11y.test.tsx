import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Inbox } from 'lucide-react'
import { EmptyState } from '../../src/components/empty-state'
import { StatCard } from '../../src/components/stat-card'
import { Table, TableBody, TableCell, TableRow } from '../../src/components/ui/table'
import { Button } from '../../src/components/ui/button'

describe('Wave 1 / Theme D — EmptyState CTA 语义关联 (M-03 / DD-5)', () => {
  it('CTA 按钮获得 aria-describedby 且指向描述段 id', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="暂无数据"
        description="这里还没有任何记录，点击下方按钮创建第一条。"
        action={<Button>创建</Button>}
      />
    )

    const cta = screen.getByRole('button', { name: /创建/ })
    const describedBy = cta.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()

    // describedby 必须指向真实存在的描述段 <p>，且内容匹配
    const desc = document.getElementById(describedBy as string)
    expect(desc).toBeTruthy()
    expect(desc?.tagName).toBe('P')
    expect(desc?.textContent).toContain('这里还没有任何记录')
  })

  it('描述段 <p> 带有稳定 id（useId 生成）', () => {
    const { container } = render(
      <EmptyState icon={Inbox} title="空" description="描述文本" action={<Button>GO</Button>} />
    )
    const p = container.querySelector('p')
    expect(p?.id).toBeTruthy()
  })

  it('非单一元素的 action（字符串）降级为原样渲染，不崩溃', () => {
    render(
      <EmptyState icon={Inbox} title="空" description="描述" action={'纯文本行动' as unknown as React.ReactElement} />
    )
    expect(screen.getByText('纯文本行动')).toBeTruthy()
  })

  it('无 action 时正常渲染描述，不产生 describedby 目标缺失', () => {
    const { container } = render(<EmptyState icon={Inbox} title="空" description="仅描述" />)
    expect(container.querySelector('p')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Wave 1 / Theme D — StatCard 语义化标题 (L-02)', () => {
  it('Card 聚合为 role="group" 且 aria-label="label: value"', () => {
    render(<StatCard label="待审核任务" value={12} hint="较昨日 +3" />)
    const group = screen.getByRole('group', { name: '待审核任务: 12' })
    expect(group).toBeTruthy()
    expect(group.getAttribute('aria-label')).toBe('待审核任务: 12')
  })

  it('hint 作为组内文本仍可被读取', () => {
    render(<StatCard label="内存空间" value="8" hint="剩余 2 个" />)
    expect(screen.getByText('剩余 2 个')).toBeTruthy()
  })
})

describe('Wave 1 / Theme D — TableRow 键盘行高亮 (M-02)', () => {
  it('TableRow 含 focus-within:bg-muted/50 类（行内按钮获焦时整行高亮）', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Button>行内操作</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const row = screen.getByRole('button', { name: '行内操作' }).closest('tr')
    expect(row).toBeTruthy()
    expect(row?.className).toContain('focus-within:bg-muted/50')
    // 与 hover 对等：hover 类仍在
    expect(row?.className).toContain('hover:bg-muted/50')
  })

  it('TableRow 未被添加 tabIndex（不污染 Tab 序）', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const row = document.querySelector('tr[data-slot="table-row"]')
    expect(row).toBeTruthy()
    expect(row?.getAttribute('tabindex')).toBeNull()
  })
})
