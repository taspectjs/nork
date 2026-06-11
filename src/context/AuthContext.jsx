import { createContext, useContext, useState, useEffect } from 'react'

// Default password hash: "nork2024" — change via Admin panel
const DEFAULT_HASH = 'd29d40bef0a428327093d48447e65c654b980540c56465113f73e36a94d0889d'

const STORAGE_KEY = 'nork_auth'
const HASH_KEY = 'nork_pw_hash'
const USERS_KEY = 'nork_users'

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function getStoredHash() {
  return localStorage.getItem(HASH_KEY) || DEFAULT_HASH
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [{ username: 'admin', role: 'admin' }]
  } catch {
    return [{ username: 'admin', role: 'admin' }]
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) } catch { return null }
  })

  const login = async (username, password) => {
    const hash = await sha256(password)
    if (hash !== getStoredHash()) throw new Error('Wrong password')
    const users = getUsers()
    const found = users.find(u => u.username === username)
    if (!found) throw new Error('Unknown user')
    const session = { username: found.username, role: found.role, at: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
    return session
  }

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const changePassword = async (current, next) => {
    const hash = await sha256(current)
    if (hash !== getStoredHash()) throw new Error('Current password wrong')
    const newHash = await sha256(next)
    localStorage.setItem(HASH_KEY, newHash)
  }

  const addUser = (username, role = 'viewer') => {
    const users = getUsers()
    if (users.find(u => u.username === username)) throw new Error('User already exists')
    users.push({ username, role })
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }

  const removeUser = (username) => {
    if (username === 'admin') throw new Error('Cannot remove admin')
    const users = getUsers().filter(u => u.username !== username)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }

  const getAll = () => getUsers()

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, addUser, removeUser, getAll }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
