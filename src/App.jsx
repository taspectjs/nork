import { useState } from 'react'
import './App.css'

const SOURCES = [
  { id: 'source1', label: 'Source 1' },
  { id: 'source2', label: 'Source 2' },
]

function DataCard({ label }) {
  return (
    <div className="card">
      <h2>{label}</h2>
      <p className="placeholder">No data yet — connect a source to get started.</p>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState(SOURCES[0].id)

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
        {SOURCES.filter((s) => s.id === active).map((s) => (
          <DataCard key={s.id} label={s.label} />
        ))}
      </main>
    </div>
  )
}
