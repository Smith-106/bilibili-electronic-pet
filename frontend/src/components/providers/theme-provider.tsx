import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'sepia'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'admin_theme'
const THEMES: Theme[] = ['light', 'dark', 'sepia']

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'sepia') return stored
  return 'light'
}

function applyThemeClass(theme: Theme) {
  const body = document.body
  body.classList.remove('dark', 'sepia')
  if (theme !== 'light') {
    body.classList.add(theme)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyThemeClass(newTheme)
  }, [])

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEMES.indexOf(prev)
      const next = THEMES[(idx + 1) % THEMES.length]
      localStorage.setItem(STORAGE_KEY, next)
      applyThemeClass(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
