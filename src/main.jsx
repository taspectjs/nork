import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 32, fontFamily: 'monospace', background: '#0a0c14', color: '#ef4444', minHeight: '100vh' }}>
        <h2 style={{ color: '#fff', marginBottom: 16 }}>App crashed</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#f87171' }}>
          {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack}
        </pre>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
