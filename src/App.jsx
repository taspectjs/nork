import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './pages/DashboardLayout'
import AdminPage from './pages/AdminPage'
import SubmarineCables from './components/SubmarineCables'
import PdfTool from './components/PdfTool'

function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route index element={<Navigate to="cables" replace />} />
            <Route path="cables" element={<SubmarineCables />} />
            <Route path="pdf"    element={<PdfTool />} />
            <Route path="admin"  element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
