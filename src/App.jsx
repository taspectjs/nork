import { useState } from 'react'
import SubmarineCables from './components/SubmarineCables'
import './App.css'

const SOURCES = [
  { id: 'cables', label: 'Submarine Cables', component: <SubmarineCables /> },
  { id: 'source2', label: 'Source 2', component: null },
]

function Placeholder({ label }) {
  return (
    <div className="card">
      <h2>{label}</h2>
      <p className="placeholder">Not connected yet.</p>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState(SOURCES[0].id)
  const source = SOURCES.find(s => s.id === active)

  return (
    <div className="layout">
      <header className="topbar">
        <span className="logo">NORK</span>
        <nav>
          {SOURCES.map((s) => (
            <button
              key={s.id}
              className={active === s.id ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {source?.component ?? <Placeholder label={source?.label} />}
      </main>
    </div>
  )
}
