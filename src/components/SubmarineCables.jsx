import { useEffect, useState } from 'react'
import './SubmarineCables.css'

// Load estimate: real utilization data is not public.
// Model: base 60-75% + route-specific peak by UTC hour + per-cable seed variance.
function estimateLoad(cable) {
  const utcHour = new Date().getUTCHours()
  const seed = cable.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const variance = ((seed % 11) - 5) / 100  // ±5%

  let peak = 0
  if (cable.route === 'Trans-Atlantic') {
    // US-EU overlap: 13–21 UTC
    peak = utcHour >= 13 && utcHour <= 21 ? 0.18 : 0
  } else if (cable.route === 'Trans-Pacific') {
    // Asia-US overlap: 0–8 UTC
    peak = utcHour >= 0 && utcHour <= 8 ? 0.15 : 0
    // Also US-Asia evening: 23 UTC
    if (utcHour === 23) peak = 0.1
  } else if (cable.route === 'Asia-Europe') {
    // EU-Asia overlap: 6–14 UTC
    peak = utcHour >= 6 && utcHour <= 14 ? 0.16 : 0
  } else {
    peak = utcHour >= 8 && utcHour <= 18 ? 0.12 : 0
  }

  const base = 0.60 + (seed % 15) / 100
  return Math.min(0.97, Math.max(0.35, base + peak + variance))
}

function loadColor(pct) {
  if (pct >= 0.85) return '#ef4444'
  if (pct >= 0.70) return '#f59e0b'
  return '#22c55e'
}

function LoadBar({ pct }) {
  const color = loadColor(pct)
  return (
    <div className="load-bar-track">
      <div className="load-bar-fill" style={{ width: `${pct * 100}%`, background: color }} />
    </div>
  )
}

export default function SubmarineCables() {
  const [cables, setCables] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [sortBy, setSortBy] = useState('load')

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'cables.json')
      .then(r => r.json())
      .then(data => {
        const withLoad = data.map(c => ({ ...c, load: estimateLoad(c) }))
        setCables(withLoad)
        setLoading(false)
      })
  }, [])

  const routes = ['All', ...Array.from(new Set(cables.map(c => c.route))).sort()]

  const visible = cables
    .filter(c => filter === 'All' || c.route === filter)
    .sort((a, b) => {
      if (sortBy === 'load') return b.load - a.load
      if (sortBy === 'capacity') return b.capacity_tbps - a.capacity_tbps
      return a.name.localeCompare(b.name)
    })

  const totalCapacity = cables.reduce((s, c) => s + c.capacity_tbps, 0)
  const avgLoad = cables.length ? cables.reduce((s, c) => s + c.load, 0) / cables.length : 0

  if (loading) return <div className="sc-loading">Loading cable data...</div>

  return (
    <div className="sc-wrapper">
      <div className="sc-header">
        <div>
          <h2>International Submarine Cables</h2>
          <p className="sc-disclaimer">
            Capacity: publicly reported figures. Load: time-of-day estimate — actual utilization data is not public.
          </p>
        </div>
        <div className="sc-stats">
          <div className="stat">
            <span className="stat-value">{cables.length}</span>
            <span className="stat-label">cables</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalCapacity.toLocaleString()} Tbps</span>
            <span className="stat-label">total capacity</span>
          </div>
          <div className="stat">
            <span className="stat-value" style={{ color: loadColor(avgLoad) }}>
              {Math.round(avgLoad * 100)}%
            </span>
            <span className="stat-label">avg est. load</span>
          </div>
        </div>
      </div>

      <div className="sc-controls">
        <div className="filter-group">
          {routes.map(r => (
            <button
              key={r}
              className={filter === r ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="load">Sort: Load</option>
          <option value="capacity">Sort: Capacity</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="sc-table">
        <div className="sc-row sc-thead">
          <span>Cable</span>
          <span>Route</span>
          <span>Capacity</span>
          <span>Countries</span>
          <span>Est. Load</span>
        </div>
        {visible.map(c => (
          <div key={c.id} className="sc-row">
            <div className="cable-name">
              <span>{c.name}</span>
              <span className="cable-owners">{c.owners.slice(0, 3).join(', ')}{c.owners.length > 3 ? ` +${c.owners.length - 3}` : ''}</span>
            </div>
            <span className="route-badge">{c.route}</span>
            <span className="capacity">{c.capacity_tbps} Tbps</span>
            <span className="countries">{c.countries.slice(0, 4).join(', ')}{c.countries.length > 4 ? ` +${c.countries.length - 4}` : ''}</span>
            <div className="load-cell">
              <span style={{ color: loadColor(c.load) }}>{Math.round(c.load * 100)}%</span>
              <LoadBar pct={c.load} />
            </div>
          </div>
        ))}
      </div>

      <p className="sc-source">
        Cable metadata: <a href="https://www.submarinecablemap.com/" target="_blank" rel="noreferrer">TeleGeography Submarine Cable Map</a>
        {' · '}Capacity from public press releases and industry reports.
      </p>
    </div>
  )
}
