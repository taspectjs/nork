import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './DashboardLayout.css'

const ALL_NAV = [
  { to: 'daily',  label: 'Daily',            icon: '📅', page: 'daily'  },
  { to: 'cables', label: 'Submarine Cables', icon: '🌊', page: 'cables' },
  { to: 'pdf',    label: 'PDF Tools',        icon: '📄', page: 'pdf'    },
]

export function RequirePage({ page, children }) {
  const { user } = useAuth()
  const allowed = user?.role === 'admin' || user?.pages?.includes(page)
  return allowed ? children : <Navigate to="/dashboard" replace />
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const visibleNav = ALL_NAV.filter(item =>
    user?.role === 'admin' || user?.pages?.includes(item.page)
  )

  function handleLogout() {
    logout()
    navigate('/')
  }

  // Redirect to first allowed page if at /dashboard root
  const firstAllowed = visibleNav[0]?.to ?? 'daily'

  return (
    <div className={`dash-root ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-logo">{collapsed ? 'N' : 'NORK'}</span>
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} title="Toggle sidebar">
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {user?.role === 'admin' && (
            <NavLink
              to="admin"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'Admin' : ''}
            >
              <span className="nav-icon">⚙</span>
              {!collapsed && <span className="nav-label">Admin</span>}
            </NavLink>
          )}

          <div className="user-row" title={collapsed ? user?.username : ''}>
            <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">{user?.username}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            )}
          </div>

          <button className="nav-item signout-btn" onClick={handleLogout} title="Sign out">
            <span className="nav-icon">⏻</span>
            {!collapsed && <span className="nav-label">Sign out</span>}
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <Outlet context={{ firstAllowed }} />
      </main>
    </div>
  )
}
