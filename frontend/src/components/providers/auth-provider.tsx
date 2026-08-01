import { createContext, useCallback, useContext, useState } from 'react'
import { requestJson } from '@/lib/api-client'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (apiKey: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'admin_session_token'
const API_KEY_STORAGE = 'admin_api_key'

let sessionToken = sessionStorage.getItem(SESSION_KEY)?.trim() || ''
let apiKey = sessionStorage.getItem(API_KEY_STORAGE)?.trim() || ''

export function getSessionToken() {
  return sessionToken
}

export function getApiKey() {
  return apiKey
}

function setCredentials({ session = '', key = '' }) {
  sessionToken = session.trim()
  apiKey = key.trim()

  if (sessionToken) {
    sessionStorage.setItem(SESSION_KEY, sessionToken)
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }

  if (apiKey) {
    sessionStorage.setItem(API_KEY_STORAGE, apiKey)
  } else {
    sessionStorage.removeItem(API_KEY_STORAGE)
  }
}

function clearCredentials() {
  sessionToken = ''
  apiKey = ''
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(API_KEY_STORAGE)
}

function hasStoredAuth(): boolean {
  return !!(sessionToken || apiKey)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredAuth)

  const login = useCallback(async (inputApiKey: string) => {
    clearCredentials()

    // Try session login first
    try {
      const payload = await requestJson<{ session_token?: string }>(
        '/api/admin/session/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: inputApiKey }),
        },
      )
      const token = String(payload?.session_token || '').trim()
      if (!token) throw new Error('session_token_missing')
      setCredentials({ session: token })
      setIsAuthenticated(true)
      return
    } catch {
      // Fall through to legacy
    }

    // Legacy API key fallback
    setCredentials({ key: inputApiKey })
    try {
      await requestJson('/api/admin/overview')
      setIsAuthenticated(true)
    } catch {
      clearCredentials()
      throw new Error('API Key 无效或服务不可用')
    }
  }, [])

  const logout = useCallback(() => {
    clearCredentials()
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
