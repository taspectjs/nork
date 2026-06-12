import { useState } from 'react'
import { useAuth, ALL_PAGES } from '../context/AuthContext'
import './AdminPage.css'

const PAGE_LABELS = { daily: '📅 Daily', cables: '🌊 Cables', pdf: '📄 PDF Tools' }

const BUILD_TIME = new Date().toISOString().slice(0, 10)

function Section({ title, children }) {
  return (
    <div className="admin-section">
      <h3 className="admin-section-title">{title}</h3>
      {children}
    </div>
  )
}

function UserEntry({ u, onRemove, onReset, onPagesChange }) {
  const [tab, setTab] = useState(null) // null | 'pw' | 'pages'
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState(null)
  const [pages, setPages] = useState(u.pages ?? [...ALL_PAGES])

  async function handleReset(e) {
    e.preventDefault()
    setMsg(null)
    try {
      await onReset(u.username, pw)
      setMsg({ ok: true, text: 'Password reset.' })
      setPw('')
      setTimeout(() => { setTab(null); setMsg(null) }, 1500)
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  function togglePage(page) {
    const next = pages.includes(page) ? pages.filter(p => p !== page) : [...pages, page]
    setPages(next)
    onPagesChange(u.username, next)
  }

  return (
    <div className="user-entry-wrap">
      <div className="user-entry">
        <span className="ue-avatar">{u.username[0].toUpperCase()}</span>
        <span className="ue-name">{u.username}</span>
        <span className="ue-role">{u.role}</span>
        <button className={`ue-icon-btn ${tab === 'pages' ? 'active' : ''}`} title="Page access" onClick={() => { setTab(t => t === 'pages' ? null : 'pages'); setMsg(null) }}>🔒</button>
        <button className={`ue-icon-btn ${tab === 'pw' ? 'active' : ''}`} title="Reset password" onClick={() => { setTab(t => t === 'pw' ? null : 'pw'); setMsg(null); setPw('') }}>🔑</button>
        {u.username !== 'admin' && (
          <button className="ue-remove" onClick={() => onRemove(u.username)} title="Remove user">✕</button>
        )}
      </div>

      {tab === 'pages' && (
        <div className="pages-form">
          {u.role === 'admin'
            ? <span className="admin-note" style={{ padding: '6px 0' }}>Admin has access to all pages.</span>
            : ALL_PAGES.map(page => (
              <label key={page} className="page-check">
                <input type="checkbox" checked={pages.includes(page)} onChange={() => togglePage(page)} />
                {PAGE_LABELS[page]}
              </label>
            ))
          }
        </div>
      )}

      {tab === 'pw' && (
        <form onSubmit={handleReset} className="reset-form">
          <input type="password" placeholder="New password (min 8 chars)" value={pw}
            onChange={e => setPw(e.target.value)} minLength={8} required autoFocus />
          <button type="submit" className="admin-btn">Set</button>
          <button type="button" className="admin-btn secondary" onClick={() => setTab(null)}>Cancel</button>
          {msg && <span className={`admin-msg inline ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
        </form>
      )}
    </div>
  )
}

export default function AdminPage() {
  const { user, changePassword, resetUserPassword, updateUserPages, addUser, removeUser, getAll } = useAuth()
  const [users, setUsers] = useState(() => getAll())

  // Own password change
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState(null)

  // New user
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState('viewer')
  const [newUserPw, setNewUserPw] = useState('')
  const [userMsg, setUserMsg] = useState(null)

  // Data source
  const [cableSource, setCableSource] = useState(
    () => localStorage.getItem('nork_cable_source') || 'static'
  )

  // Deploy info
  const [deployInfo, setDeployInfo] = useState(null)
  const [deployLoading, setDeployLoading] = useState(false)

  async function handlePwChange(e) {
    e.preventDefault()
    setPwMsg(null)
    try {
      await changePassword(curPw, newPw)
      setPwMsg({ ok: true, text: 'Password updated.' })
      setCurPw(''); setNewPw('')
    } catch (err) {
      setPwMsg({ ok: false, text: err.message })
    }
  }

  async function handleAddUser(e) {
    e.preventDefault()
    setUserMsg(null)
    try {
      await addUser(newUsername.trim(), newRole, newUserPw)
      setUsers(getAll())
      setUserMsg({ ok: true, text: `User "${newUsername}" added.` })
      setNewUsername(''); setNewUserPw('')
    } catch (err) {
      setUserMsg({ ok: false, text: err.message })
    }
  }

  function handleRemoveUser(username) {
    try {
      removeUser(username)
      setUsers(getAll())
    } catch (err) {
      setUserMsg({ ok: false, text: err.message })
    }
  }

  async function fetchDeployInfo() {
    setDeployLoading(true)
    try {
      const res = await fetch('https://api.github.com/repos/taspectjs/nork/actions/runs?per_page=3')
      const data = await res.json()
      setDeployInfo(data.workflow_runs?.slice(0, 3) || [])
    } catch {
      setDeployInfo([])
    }
    setDeployLoading(false)
  }

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h2>Admin</h2>
        <span className="admin-role-badge">{user?.role}</span>
      </div>

      <div className="admin-grid">

        <Section title="Change My Password">
          <form onSubmit={handlePwChange} className="admin-form">
            <input type="password" placeholder="Current password" value={curPw}
              onChange={e => setCurPw(e.target.value)} required />
            <input type="password" placeholder="New password (min 8 chars)" value={newPw}
              onChange={e => setNewPw(e.target.value)} minLength={8} required />
            <button type="submit" className="admin-btn">Update</button>
            {pwMsg && <p className={`admin-msg ${pwMsg.ok ? 'ok' : 'err'}`}>{pwMsg.text}</p>}
          </form>
        </Section>

        <Section title="Users">
          <div className="user-list">
            {users.map(u => (
              <UserEntry
                key={u.username}
                u={u}
                onRemove={handleRemoveUser}
                onReset={resetUserPassword}
                onPagesChange={(username, pages) => { updateUserPages(username, pages); setUsers(getAll()) }}
              />
            ))}
          </div>

          <form onSubmit={handleAddUser} className="admin-form" style={{ marginTop: 14 }}>
            <div className="admin-form-row">
              <input type="text" placeholder="Username" value={newUsername}
                onChange={e => setNewUsername(e.target.value)} required />
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="admin-select">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="admin-form-row">
              <input type="password" placeholder="Password (min 8 chars)" value={newUserPw}
                onChange={e => setNewUserPw(e.target.value)} minLength={8} required />
              <button type="submit" className="admin-btn">Add User</button>
            </div>
            {userMsg && <p className={`admin-msg ${userMsg.ok ? 'ok' : 'err'}`}>{userMsg.text}</p>}
          </form>
        </Section>

        <Section title="Data Sources">
          <div className="source-row">
            <span>Submarine Cable Data</span>
            <select value={cableSource} onChange={e => { setCableSource(e.target.value); localStorage.setItem('nork_cable_source', e.target.value) }} className="admin-select">
              <option value="static">Static (cables.json in repo)</option>
              <option value="telegeography">TeleGeography API (build-time)</option>
            </select>
          </div>
          <p className="admin-note">
            Cable data is pre-fetched at build time and stored in <code>public/cables.json</code>. Push a new commit to refresh.
          </p>
          <div className="source-row" style={{ marginTop: 12 }}>
            <span>Last data file</span>
            <span className="data-stat">{BUILD_TIME} · 12 cables</span>
          </div>
        </Section>

        <Section title="App Settings">
          <div className="settings-list">
            <div className="setting-row"><span>Theme</span><span className="setting-val">Dark (fixed)</span></div>
            <div className="setting-row"><span>App version</span><span className="setting-val">1.0.0</span></div>
            <div className="setting-row"><span>Auth type</span><span className="setting-val">Per-user SHA256 hash</span></div>
          </div>
        </Section>

        <Section title="Deploy & CI">
          <div className="deploy-meta">
            <div className="setting-row"><span>Repo</span><a href="https://github.com/taspectjs/nork" target="_blank" rel="noreferrer" className="deploy-link">taspectjs/nork</a></div>
            <div className="setting-row"><span>Hosting</span><span className="setting-val">GitHub Pages</span></div>
            <div className="setting-row"><span>Branch</span><span className="setting-val">main</span></div>
          </div>
          <button className="admin-btn" style={{ marginTop: 12 }} onClick={fetchDeployInfo} disabled={deployLoading}>
            {deployLoading ? 'Loading…' : 'Load recent runs'}
          </button>
          {deployInfo && (
            <div className="deploy-runs">
              {deployInfo.length === 0 && <p className="admin-note">No runs found.</p>}
              {deployInfo.map(r => (
                <a key={r.id} href={r.html_url} target="_blank" rel="noreferrer" className="deploy-run">
                  <span className={`run-dot ${r.conclusion === 'success' ? 'ok' : 'fail'}`} />
                  <span className="run-sha">{r.head_sha.slice(0, 7)}</span>
                  <span className="run-status">{r.conclusion || r.status}</span>
                  <span className="run-date">{new Date(r.created_at).toLocaleDateString()}</span>
                </a>
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
