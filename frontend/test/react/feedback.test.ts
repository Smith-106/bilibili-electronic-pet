import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { toastMutationError } from '../../src/lib/feedback'

// sonner 是 ESM 具名导出，mock 出 toast.error 以便断言调用参数
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

const errorMock = vi.mocked(toast.error)

// sonner 的 action 是联合类型，这里收敛到对象形态以便断言
interface ToastAction {
  label: string
  onClick: (event?: unknown) => void
}

function lastOptions() {
  return errorMock.mock.calls[errorMock.mock.calls.length - 1][1]
}

function lastAction(): ToastAction {
  return lastOptions()?.action as unknown as ToastAction
}

describe('lib/feedback — toastMutationError (Theme B / H-05)', () => {
  beforeEach(() => {
    errorMock.mockClear()
  })

  it('幂等操作：传 retry → 渲染 action 按钮且默认 duration 8000ms (DD-6)', () => {
    const retry = vi.fn()
    toastMutationError('审批失败：网络错误。请重试', { retry })

    expect(errorMock).toHaveBeenCalledTimes(1)
    const [message, options] = errorMock.mock.calls[0]
    expect(message).toBe('审批失败：网络错误。请重试')
    expect(options).toBeDefined()
    expect(options?.duration).toBe(8000)
    expect(options?.action).toBeDefined()
    expect(lastAction().label).toBe('重试') // R2：固定动词"重试"
  })

  it('action.onClick 触发 retry 回调（重放 mutation）', () => {
    const retry = vi.fn()
    toastMutationError('同步失败', { retry })

    expect(options_action_present()).toBe(true)
    // 模拟用户点击"重试"按钮
    lastAction().onClick()
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('非幂等操作：不传 retry → 纯文字，无 action 无自定义 duration (R5)', () => {
    toastMutationError('删除失败: 资源不存在')

    expect(errorMock).toHaveBeenCalledTimes(1)
    const [message, options] = errorMock.mock.calls[0]
    expect(message).toBe('删除失败: 资源不存在')
    // 非幂等：第二参为 undefined（不渲染 action 按钮，避免误重试）
    expect(options).toBeUndefined()
  })

  it('自定义 retryLabel 覆盖默认文案', () => {
    toastMutationError('导出失败', { retry: vi.fn(), retryLabel: '重新导出' })
    expect(lastAction().label).toBe('重新导出')
  })

  it('自定义 duration 覆盖默认 8000ms', () => {
    toastMutationError('操作失败', { retry: vi.fn(), duration: 5000 })
    expect(lastOptions()?.duration).toBe(5000)
  })

  it('message 保持原样透传，不被截断或改写 (R3 what/why/fix 三段式不回退)', () => {
    const longMsg = '批量审批失败：部分任务已被处理。请刷新列表确认任务状态后重试'
    toastMutationError(longMsg, { retry: vi.fn() })
    expect(errorMock.mock.calls[0][0]).toBe(longMsg)
  })
})

function options_action_present(): boolean {
  return lastOptions()?.action !== undefined
}
