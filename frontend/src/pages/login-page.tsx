import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return

    setError('')
    setLoading(true)
    try {
      await login(apiKey.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-primary">Bili Pet 管理面板</CardTitle>
          <CardDescription>请输入 API Key 以登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-api-key">API Key</Label>
              <Input
                id="login-api-key"
                type="password"
                placeholder="API Key"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !apiKey.trim()}>
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
