import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { JobsPage } from '@/pages/jobs-page'
import { DailyMetricsPage } from '@/pages/daily-metrics-page'
import { KnowledgePage } from '@/pages/knowledge-page'
import { MemoryPage } from '@/pages/memory-page'
import { RoleCardsPage } from '@/pages/role-cards-page'
import { ProfilesPage } from '@/pages/profiles-page'
import { PetCorePage } from '@/pages/pet-core-page'
import { ConnectionsPage } from '@/pages/connections-page'
import { GatewayPage } from '@/pages/gateway-page'
import { AuditPage } from '@/pages/audit-page'
import { BilibiliPage } from '@/pages/bilibili-page'
import { QueryPage } from '@/pages/query-page'

export function App() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/daily-metrics" element={<DailyMetricsPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/role-cards" element={<RoleCardsPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/pet-core" element={<PetCorePage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/gateway" element={<GatewayPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/bilibili" element={<BilibiliPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  )
}
