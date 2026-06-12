import { createContext, useContext, useState } from 'react'

const DEFAULT_HASH = 'd29d40bef0a428327093d48447e65c654b980540c56465113f73e36a94d0889d' // nork2024
const SESSION_KEY  = 'nork_auth'
const USERS_KEY    = 'nork_users'

export const ALL_PAGES = ['daily', 'cables', 'pdf']

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function loadUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY))
    if (Array.isArray(raw) && raw.length) {
      return raw.map(u => ({
        ...u,
        pwHash: u.pwHash || DEFAULT_HASH,
        pages:  u.pages  || [...ALL_PAGES],
      }))
    }
  } catch {}
  return [{ username: 'admin', role: 'admin', pwHash: DEFAULT_HASH, pages: [...ALL_PAGES] }]
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
    const session = { username: found.username, role: found.role, pages: found.pages, at: Date.now() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return session
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const changePassword = async (currentPw, newPw) => {
    const hash = await sha256(currentPw)
    const users = loadUsers()
    const idx = users.findIndex(u => u.username === user.username)
    if (idx === -1 || users[idx].pwHash !== hash) throw new Error('Current password wrong')
    users[idx] = { ...users[idx], pwHash: await sha256(newPw) }
    saveUsers(users)
  }

  const resetUserPassword = async (username, newPw) => {
    const users = loadUsers()
    const idx = users.findIndex(u => u.username === username)
    if (idx === -1) throw new Error('User not found')
    users[idx] = { ...users[idx], pwHash: await sha256(newPw) }
    saveUsers(users)
  }

  const updateUserPages = (username, pages) => {
    const users = loadUsers()
    const idx = users.findIndex(u => u.username === username)
    if (idx === -1) throw new Error('User not found')
    users[idx] = { ...users[idx], pages }
    saveUsers(users)
    // update own session if editing self
    if (username === user?.username) {
      const updated = { ...user, pages }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      setUser(updated)
    }
  }

  const addUser = async (username, role = 'viewer', password, pages = [...ALL_PAGES]) => {
    if (!password) throw new Error('Password required')
    const users = loadUsers()
    if (users.find(u => u.username === username)) throw new Error('Username already taken')
    users.push({ username, role, pwHash: await sha256(password), pages })
    saveUsers(users)
  }

  const removeUser = (username) => {
    if (username === 'admin') throw new Error('Cannot remove admin')
    saveUsers(loadUsers().filter(u => u.username !== username))
  }

  const getAll = () => loadUsers().map(({ username, role, pages }) => ({ username, role, pages }))

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, resetUserPassword, updateUserPages, addUser, removeUser, getAll }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
