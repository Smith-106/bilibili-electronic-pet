import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ListTodo,
  Clock,
  BookOpen,
  Brain,
  Shield,
  Settings,
  Heart,
  Plug,
  Network,
  Search,
  Play,
  Filter,
  Moon,
  Sun,
  Palette,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard },
  { to: '/jobs', label: '任务管理', icon: ListTodo },
  { to: '/daily-metrics', label: '每日指标', icon: Clock },
  { to: '/knowledge', label: '知识库', icon: BookOpen },
  { to: '/memory', label: 'Memory 管理', icon: Brain },
  { to: '/role-cards', label: '角色卡', icon: Shield },
  { to: '/profiles', label: '风格配置', icon: Settings },
  { to: '/pet-core', label: '宠物核心', icon: Heart },
  { to: '/connections', label: '平台连接', icon: Plug },
  { to: '/gateway', label: '网关', icon: Network },
  { to: '/audit', label: '审计日志', icon: Search },
  { to: '/bilibili', label: 'B站集成', icon: Play },
  { to: '/query', label: '查询', icon: Filter },
] as const

const THEME_ICONS = { light: Sun, dark: Moon, sepia: Palette } as const

export function AppShell() {
  const { theme, cycleTheme } = useTheme()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const ThemeIcon = THEME_ICONS[theme]
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  /* Drawer a11y (Round-2 RC-6): Escape closes, Tab is trapped inside while
     open, and focus returns to the hamburger trigger on close. */
  useEffect(() => {
    if (!mobileOpen) return
    const drawer = drawerRef.current
    const trigger = menuButtonRef.current
    drawer?.querySelector<HTMLElement>('a[href], button')?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        trigger?.focus()
        return
      }
      if (e.key !== 'Tab' || !drawer) return
      const focusables = drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Return focus to the trigger if it was inside the closing drawer
      if (drawer?.contains(document.activeElement)) trigger?.focus()
    }
  }, [mobileOpen])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile: open drawer */}
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开导航菜单"
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>
          {/* Desktop: collapse rail */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-10 w-10 md:inline-flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <span className="text-base font-semibold text-primary">Bili Pet</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={cycleTheme}
            aria-label="切换主题"
            title={`当前: ${theme}`}
          >
            <ThemeIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={logout}
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile drawer backdrop (transform/opacity only).
            role="presentation": click-dismiss layer with no semantics
            (was aria-hidden while click-interactive — contradictory). */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 animate-in fade-in duration-(--duration-fast) md:hidden"
            onClick={() => setMobileOpen(false)}
            role="presentation"
          />
        )}

        {/* Sidebar:
            - mobile: fixed drawer, slides via transform (no layout animation)
            - desktop: static rail; width switches instantly (single reflow, no
              per-frame layout thrash), labels enter via transform+opacity */}
        <aside
          ref={drawerRef}
          id="mobile-drawer"
          aria-label="侧边导航"
          className={cn(
            'flex flex-col border-r border-sidebar-border bg-sidebar',
            'fixed inset-y-0 left-0 z-40 w-[220px] transition-transform duration-(--duration-slow) ease-[var(--ease-out-quart)]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            'md:static md:inset-auto md:z-auto md:translate-x-0 md:transition-none',
            collapsed ? 'md:w-[52px]' : 'md:w-[220px]',
          )}
        >
          <div
            className={cn(
              'flex h-10 items-center px-4 text-sm font-medium uppercase tracking-wider text-muted-foreground md:text-xs',
              collapsed && 'md:hidden',
            )}
          >
            管理面板
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    collapsed && 'md:justify-center md:px-2',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span
                  className={cn(
                    'animate-in fade-in slide-in-from-left-2 duration-(--duration-fast)',
                    collapsed && 'md:hidden',
                  )}
                >
                  {label}
                </span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
