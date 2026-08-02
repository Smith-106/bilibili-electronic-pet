import { toast } from 'sonner'

interface MutationErrorOptions {
  /** 重试回调。仅当操作幂等（重复执行结果一致）时提供 */
  retry?: () => void
  /** 重试按钮文案，默认"重试" */
  retryLabel?: string
  /** toast 停留时长，提供 action 时默认 8000ms */
  duration?: number
}

/** M-07: 机器码 → 人类文案映射。未知码兑底"操作失败"，技术码仅 console.debug */
const ERROR_TEXT: Record<string, string> = {
  request_failed: '服务暂时不可用，请稍后重试',
  not_found: '目标资源不存在或已被删除',
  session_token_missing: '登录状态已失效，请重新登录',
  download_failed: '文件下载失败，请检查网络后重试',
  unauthorized: '权限不足，请确认 API Key 有效',
  forbidden: '权限不足，无法执行此操作',
  validation_error: '输入内容不符合要求，请检查后重试',
  conflict: '操作冲突，目标状态已被其他操作变更',
}

/** 将 sanitizeErrorDetail 输出的机器码转为人类可读文案（保留中文上下文） */
export function humanizeErrorCode(message: string): string {
  // message 格式如 "审批失败：request_failed。请确认..."
  // 提取裸机器码（全小写+下划线+数字的 token）
  return message.replace(/\b([a-z][a-z0-9_]*(?::[a-z0-9_]+)*)\b/g, (match) => {
    if (ERROR_TEXT[match]) return ERROR_TEXT[match]
    // 非映射码：若形如机器码（含下划线且非中文语境常见词）则替换为兑底
    if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(match)) {
      console.debug('[feedback] unmapped error code:', match)
      return '操作失败'
    }
    return match // 非机器码文本原样保留
  })
}

/**
 * mutation 失败统一反馈（Theme B 约定）：
 * - 幂等操作：传 retry → 渲染 action 按钮，8s 决策窗口
 * - 非幂等操作：不传 retry → 纯文字指引（message 内须含 how-to-fix）
 * - M-07: 消息统一经 humanizeErrorCode 映射，机器码不直接展示给用户
 */
export function toastMutationError(message: string, options: MutationErrorOptions = {}) {
  const { retry, retryLabel = '重试', duration } = options
  const humanMessage = humanizeErrorCode(message)
  if (retry) {
    toast.error(humanMessage, {
      duration: duration ?? 8000,
      action: { label: retryLabel, onClick: retry },
    })
  } else {
    toast.error(humanMessage)
  }
}
