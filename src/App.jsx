import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout, { RequirePage } from './pages/DashboardLayout'
import AdminPage from './pages/AdminPage'
import DailyPage from './pages/DailyPage'
import SubmarineCables from './components/SubmarineCables'
import PdfTool from './components/PdfTool'

function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function DefaultRedirect() {
  const { user } = useAuth()
  const pages = user?.pages ?? []
  const first = ['daily', 'cables', 'pdf'].find(p => user?.role === 'admin' || pages.includes(p))
  return <Navigate to={first ?? 'daily'} replace />
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="daily"  element={<RequirePage page="daily"><DailyPage /></RequirePage>} />
            <Route path="cables" element={<RequirePage page="cables"><SubmarineCables /></RequirePage>} />
            <Route path="pdf"    element={<RequirePage page="pdf"><PdfTool /></RequirePage>} />
            <Route path="admin"  element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
