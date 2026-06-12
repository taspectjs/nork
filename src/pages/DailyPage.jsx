import { useEffect, useState } from 'react'
import { format, getWeek, getDayOfYear, getQuarter } from 'date-fns'
import { de } from 'date-fns/locale'
import './DailyPage.css'

const WMO_CODES = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Foggy', 48:'Icy fog', 51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain', 71:'Light snow', 73:'Snow', 75:'Heavy snow',
  80:'Rain showers', 81:'Showers', 82:'Heavy showers', 85:'Snow showers',
  95:'Thunderstorm', 96:'Thunderstorm + hail', 99:'Heavy thunderstorm + hail',
}
const WMO_ICON = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️', 45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️', 61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'❄️', 75:'❄️', 80:'🌦️', 81:'🌧️', 82:'⛈️',
  85:'🌨️', 95:'⛈️', 96:'⛈️', 99:'⛈️',
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m&hourly=temperature_2m&forecast_days=1&timezone=auto`
  const res = await fetch(url)
  const d = await res.json()
  return d.current
}

async function fetchLocation() {
  const res = await fetch('https://ipapi.co/json/')
  const d = await res.json()
  return { lat: d.latitude, lon: d.longitude, city: d.city, country: d.country_name }
}

async function fetchNews() {
  // Hacker News top stories — public API, no key needed
  const ids = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json())
  const top = await Promise.all(ids.slice(0, 8).map(id =>
    fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
  ))
  return top.filter(Boolean)
}

export default function DailyPage() {
  const now = useClock()
  const [weather, setWeather] = useState(null)
  const [location, setLocation] = useState(null)
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [weatherLoading, setWeatherLoading] = useState(true)

  useEffect(() => {
    fetchLocation()
      .then(loc => {
        setLocation(loc)
        return fetchWeather(loc.lat, loc.lon)
      })
      .then(setWeather)
      .catch(() => {})
      .finally(() => setWeatherLoading(false))

    fetchNews()
      .then(setNews)
      .catch(() => {})
      .finally(() => setNewsLoading(false))
  }, [])

  const wcode = weather?.weathercode ?? null
  const weekday = format(now, 'EEEE', { locale: de })
  const dateStr = format(now, 'd. MMMM yyyy', { locale: de })
  const timeStr = format(now, 'HH:mm:ss')

  return (
    <div className="daily-wrapper">

      {/* Clock + Date */}
      <div className="daily-hero">
        <div className="daily-time">{timeStr}</div>
        <div className="daily-date">{weekday}, {dateStr}</div>
      </div>

      <div className="daily-grid">

        {/* Weather */}
        <div className="daily-card weather-card">
          <div className="card-label">Weather</div>
          {weatherLoading && <p className="daily-loading">Loading…</p>}
          {!weatherLoading && !weather && <p className="daily-empty">Could not load weather</p>}
          {weather && (
            <>
              <div className="weather-main">
                <span className="weather-icon">{WMO_ICON[wcode] ?? '🌡️'}</span>
                <div>
                  <div className="weather-temp">{Math.round(weather.temperature_2m)}°C</div>
                  <div className="weather-desc">{WMO_CODES[wcode] ?? '—'}</div>
                </div>
              </div>
              <div className="weather-meta">
                <span>Feels like {Math.round(weather.apparent_temperature)}°C</span>
                <span>💧 {weather.relativehumidity_2m}%</span>
                <span>💨 {Math.round(weather.windspeed_10m)} km/h</span>
              </div>
              {location && (
                <div className="weather-location">📍 {location.city}, {location.country}</div>
              )}
            </>
          )}
        </div>

        {/* Quick stats */}
        <div className="daily-card stats-card">
          <div className="card-label">Today</div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-num">{getWeek(now, { locale: de })}</span>
              <span className="stat-lbl">Week of year</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{getDayOfYear(now)}</span>
              <span className="stat-lbl">Day of year</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{Math.ceil((new Date(now.getFullYear(), 11, 31) - now) / 86400000)}</span>
              <span className="stat-lbl">Days left in year</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">Q{getQuarter(now)}</span>
              <span className="stat-lbl">Quarter</span>
            </div>
          </div>
        </div>

        {/* News */}
        <div className="daily-card news-card">
          <div className="card-label">Hacker News — Top today</div>
          {newsLoading && <p className="daily-loading">Loading…</p>}
          {!newsLoading && news.length === 0 && <p className="daily-empty">Could not load news</p>}
          <div className="news-list">
            {news.map((item, i) => (
              <a key={item.id} href={item.url || `https://news.ycombinator.com/item?id=${item.id}`}
                target="_blank" rel="noreferrer" className="news-item">
                <span className="news-rank">{i + 1}</span>
                <div className="news-body">
                  <span className="news-title">{item.title}</span>
                  <span className="news-meta">
                    {item.score} pts · {item.descendants ?? 0} comments
                    {item.url && ` · ${new URL(item.url).hostname.replace('www.', '')}`}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
