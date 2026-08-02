import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function LoginPage() {
  const { login } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // L-06: API Key 明文/密文切换（复用 bilibili-page show/hide 模式）
  const [showKey, setShowKey] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return

    setError('')
    setLoading(true)
    try {
      await login(apiKey.trim())
    } catch (err) {
      // L-06: 错误文案补 how-to-fix 指引
      setError(err instanceof Error
        ? `${err.message}。请检查 Key 是否与部署配置一致，确认无多余空格`
        : '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-primary">Bili Pet 管理面板</CardTitle>
          <CardDescription>请输入 API Key 以登录（在部署配置的 .env 中设置 ADMIN_API_KEY）</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="login-api-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="API Key"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                  aria-pressed={showKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !apiKey.trim()} aria-busy={loading}>
              {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
              {loading ? '登录中...' : '登录'}
            </Button>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
