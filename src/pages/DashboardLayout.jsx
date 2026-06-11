import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './DashboardLayout.css'

const NAV = [
  { to: 'cables',  label: 'Submarine Cables', icon: '🌊' },
  { to: 'pdf',     label: 'PDF Tools',         icon: '📄' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')
  }

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
          {NAV.map(item => (
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
          <NavLink
            to="admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Admin' : ''}
          >
            <span className="nav-icon">⚙</span>
            {!collapsed && <span className="nav-label">Admin</span>}
          </NavLink>

          <div className="user-row" title={collapsed ? user?.username : ''}>
            <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">{user?.username}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            )}
            {!collapsed && (
              <button className="logout-btn" onClick={handleLogout} title="Sign out">↩</button>
            )}
          </div>
          {collapsed && (
            <button className="logout-btn logout-collapsed" onClick={handleLogout} title="Sign out">↩</button>
          )}
        </div>
      </aside>

      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  )
}
