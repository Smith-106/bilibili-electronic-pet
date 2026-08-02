import { toast } from 'sonner'

interface MutationErrorOptions {
  /** 重试回调。仅当操作幂等（重复执行结果一致）时提供 */
  retry?: () => void
  /** 重试按钮文案，默认"重试" */
  retryLabel?: string
  /** toast 停留时长，提供 action 时默认 8000ms */
  duration?: number
}

/**
 * mutation 失败统一反馈（Theme B 约定）：
 * - 幂等操作：传 retry → 渲染 action 按钮，8s 决策窗口
 * - 非幂等操作：不传 retry → 纯文字指引（message 内须含 how-to-fix）
 */
export function toastMutationError(message: string, options: MutationErrorOptions = {}) {
  const { retry, retryLabel = '重试', duration } = options
  if (retry) {
    toast.error(message, {
      duration: duration ?? 8000,
      action: { label: retryLabel, onClick: retry },
    })
  } else {
    toast.error(message)
  }
}
