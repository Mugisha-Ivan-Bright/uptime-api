import { Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./stores/auth"
import DashboardLayout from "./components/layout/DashboardLayout"
import Dashboard from "./pages/Dashboard"
import MonitorsList from "./pages/MonitorsList"
import MonitorNew from "./pages/MonitorNew"
import MonitorDetail from "./pages/MonitorDetail"
import Incidents from "./pages/Incidents"
import Alerts from "./pages/Alerts"
import Billing from "./pages/Billing"
import Settings from "./pages/Settings"
import Login from "./pages/Login"
import Register from "./pages/Register"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/monitors" element={<MonitorsList />} />
        <Route path="/monitors/new" element={<MonitorNew />} />
        <Route path="/monitors/:id" element={<MonitorDetail />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
