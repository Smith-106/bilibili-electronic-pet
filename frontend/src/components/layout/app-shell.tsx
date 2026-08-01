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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { useState } from 'react'
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
  const ThemeIcon = THEME_ICONS[theme]

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border/60 bg-background/40 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <span className="text-base font-semibold text-primary">Bili Pet</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={cycleTheme}
            aria-label="切换主题"
            title={`当前: ${theme}`}
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={logout}
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
            collapsed ? 'w-[52px]' : 'w-[220px]',
          )}
        >
          {!collapsed && (
            <div className="flex h-10 items-center px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              管理面板
            </div>
          )}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
