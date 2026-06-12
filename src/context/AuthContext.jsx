import { createContext, useContext, useState } from 'react'

const DEFAULT_HASH = 'd29d40bef0a428327093d48447e65c654b980540c56465113f73e36a94d0889d' // nork2024
const SESSION_KEY = 'nork_auth'
const USERS_KEY   = 'nork_users'

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function loadUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY))
    if (Array.isArray(raw) && raw.length) {
      // migrate: old entries without pwHash get the default hash
      return raw.map(u => ({ ...u, pwHash: u.pwHash || DEFAULT_HASH }))
    }
  } catch {}
  return [{ username: 'admin', role: 'admin', pwHash: DEFAULT_HASH }]
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
  })

  const login = async (username, password) => {
    const hash = await sha256(password)
    const users = loadUsers()
    const found = users.find(u => u.username === username)
    if (!found || found.pwHash !== hash) throw new Error('Invalid username or password')
    const session = { username: found.username, role: found.role, at: Date.now() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return session
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  // Change own password (requires current password)
  const changePassword = async (currentPw, newPw) => {
    const hash = await sha256(currentPw)
    const users = loadUsers()
    const idx = users.findIndex(u => u.username === user.username)
    if (idx === -1 || users[idx].pwHash !== hash) throw new Error('Current password wrong')
    users[idx] = { ...users[idx], pwHash: await sha256(newPw) }
    saveUsers(users)
  }

  // Admin: reset any user's password directly
  const resetUserPassword = async (username, newPw) => {
    const users = loadUsers()
    const idx = users.findIndex(u => u.username === username)
    if (idx === -1) throw new Error('User not found')
    users[idx] = { ...users[idx], pwHash: await sha256(newPw) }
    saveUsers(users)
  }

  const addUser = async (username, role = 'viewer', password) => {
    if (!password) throw new Error('Password required')
    const users = loadUsers()
    if (users.find(u => u.username === username)) throw new Error('Username already taken')
    users.push({ username, role, pwHash: await sha256(password) })
    saveUsers(users)
  }

  const removeUser = (username) => {
    if (username === 'admin') throw new Error('Cannot remove admin')
    saveUsers(loadUsers().filter(u => u.username !== username))
  }

  const getAll = () => loadUsers().map(({ username, role }) => ({ username, role }))

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, resetUserPassword, addUser, removeUser, getAll }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
