import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine,
} from 'recharts'
import './SubmarineCables.css'

const ROUTE_COLORS = {
  'Trans-Atlantic':    '#3b82f6',
  'Trans-Pacific':     '#22c55e',
  'Asia-Europe':       '#f59e0b',
  'Africa-Europe-ME':  '#a78bfa',
}

function estimateLoadAt(cable, utcHour) {
  const seed = cable.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const variance = ((seed % 11) - 5) / 100

  let peak = 0
  if (cable.route === 'Trans-Atlantic') {
    peak = utcHour >= 13 && utcHour <= 21 ? 0.18 : 0
  } else if (cable.route === 'Trans-Pacific') {
    peak = (utcHour >= 0 && utcHour <= 8) ? 0.15 : utcHour === 23 ? 0.10 : 0
  } else if (cable.route === 'Asia-Europe') {
    peak = utcHour >= 6 && utcHour <= 14 ? 0.16 : 0
  } else {
    peak = utcHour >= 8 && utcHour <= 18 ? 0.12 : 0
  }

  const base = 0.60 + (seed % 15) / 100
  return Math.min(0.97, Math.max(0.35, base + peak + variance))
}

function estimateLoad(cable) {
  return estimateLoadAt(cable, new Date().getUTCHours())
}

function loadColor(pct) {
  if (pct >= 0.85) return '#ef4444'
  if (pct >= 0.70) return '#f59e0b'
  return '#22c55e'
}

function LoadBar({ pct }) {
  return (
    <div className="load-bar-track">
      <div className="load-bar-fill" style={{ width: `${pct * 100}%`, background: loadColor(pct) }} />
    </div>
  )
}

function build24hTrend(cables) {
  const routes = [...new Set(cables.map(c => c.route))]
  return Array.from({ length: 24 }, (_, h) => {
    const point = { hour: `${String(h).padStart(2, '0')}:00` }
    routes.forEach(route => {
      const routeCables = cables.filter(c => c.route === route)
      const avg = routeCables.reduce((s, c) => s + estimateLoadAt(c, h), 0) / routeCables.length
      point[route] = Math.round(avg * 100)
    })
    return point
  })
}

function buildCapacityBars(cables) {
  return [...cables]
    .sort((a, b) => b.capacity_tbps - a.capacity_tbps)
    .map(c => ({ name: c.name, Tbps: c.capacity_tbps, route: c.route }))
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label} UTC</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  )
}

const CapTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{d.name}</p>
      <p style={{ color: ROUTE_COLORS[d.route] || '#aaa' }}>{d.route}</p>
      <p><strong>{d.Tbps} Tbps</strong></p>
    </div>
  )
}

export default function SubmarineCables() {
  const [cables, setCables] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [sortBy, setSortBy] = useState('load')
  const [view, setView] = useState('table') // 'table' | 'charts'

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'cables.json')
      .then(r => r.json())
      .then(data => {
        setCables(data.map(c => ({ ...c, load: estimateLoad(c) })))
        setLoading(false)
      })
  }, [])

  const routes = ['All', ...Array.from(new Set(cables.map(c => c.route))).sort()]
  const nowHour = new Date().getUTCHours()

  const visible = cables
    .filter(c => filter === 'All' || c.route === filter)
    .sort((a, b) => {
      if (sortBy === 'load') return b.load - a.load
      if (sortBy === 'capacity') return b.capacity_tbps - a.capacity_tbps
      return a.name.localeCompare(b.name)
    })

  const totalCapacity = cables.reduce((s, c) => s + c.capacity_tbps, 0)
  const avgLoad = cables.length ? cables.reduce((s, c) => s + c.load, 0) / cables.length : 0

  const trendData = cables.length ? build24hTrend(cables) : []
  const capData = cables.length ? buildCapacityBars(cables) : []
  const activeRoutes = [...new Set(cables.map(c => c.route))].sort()

  if (loading) return <div className="sc-loading">Loading cable data...</div>

  return (
    <div className="sc-wrapper">
      <div className="sc-header">
        <div>
          <h2>International Submarine Cables</h2>
          <p className="sc-disclaimer">
            Capacity: publicly reported figures. Load: time-of-day model — actual utilization data is not public.
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
            <button key={r} className={filter === r ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilter(r)}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {view === 'table' && (
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="load">Sort: Load</option>
              <option value="capacity">Sort: Capacity</option>
              <option value="name">Sort: Name</option>
            </select>
          )}
          <div className="view-tabs">
            <button className={view === 'table' ? 'view-btn active' : 'view-btn'} onClick={() => setView('table')}>Table</button>
            <button className={view === 'charts' ? 'view-btn active' : 'view-btn'} onClick={() => setView('charts')}>Charts</button>
          </div>
        </div>
      </div>

      {view === 'charts' && (
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-title">
              Estimated Load — 24h Trend by Route
              <span className="chart-sub">UTC · now = {String(nowHour).padStart(2,'0')}:00</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                <XAxis dataKey="hour" tick={{ fill: '#555', fontSize: 11 }} interval={3} />
                <YAxis domain={[30, 100]} tick={{ fill: '#555', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#666' }} />
                <ReferenceLine x={`${String(nowHour).padStart(2,'0')}:00`} stroke="#333" strokeDasharray="4 2" label={{ value: 'now', fill: '#555', fontSize: 10 }} />
                {activeRoutes.map(r => (
                  <Line key={r} type="monotone" dataKey={r} stroke={ROUTE_COLORS[r] || '#888'} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Capacity by Cable <span className="chart-sub">Tbps (publicly reported)</span></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={capData} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#555', fontSize: 11 }} tickFormatter={v => `${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 11 }} width={58} />
                <Tooltip content={<CapTooltip />} />
                <Bar dataKey="Tbps" radius={[0, 3, 3, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {activeRoutes.map(r => (
                <span key={r} className="legend-item">
                  <span className="legend-dot" style={{ background: ROUTE_COLORS[r] || '#888' }} />
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'table' && (
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
              <span className="route-badge" style={{ color: ROUTE_COLORS[c.route] || '#888', borderColor: ROUTE_COLORS[c.route] || '#2a2d3a' }}>{c.route}</span>
              <span className="capacity">{c.capacity_tbps} Tbps</span>
              <span className="countries">{c.countries.slice(0, 4).join(', ')}{c.countries.length > 4 ? ` +${c.countries.length - 4}` : ''}</span>
              <div className="load-cell">
                <span style={{ color: loadColor(c.load) }}>{Math.round(c.load * 100)}%</span>
                <LoadBar pct={c.load} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="sc-source">
        Cable metadata: <a href="https://www.submarinecablemap.com/" target="_blank" rel="noreferrer">TeleGeography Submarine Cable Map</a>
        {' · '}Capacity from public press releases and industry reports.
      </p>
    </div>
  )
}
