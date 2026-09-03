import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("VayuCoupler App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0B0F17', color: '#22d3ee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>VayuCoupler Dashboard</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '400px', marginBottom: '16px' }}>
            Updating system cache. Please tap below to reload the clean forecast console.
          </p>
          <button 
            onClick={() => {
              try { localStorage.clear(); } catch (_) {}
              window.location.reload();
            }}
            style={{ padding: '10px 20px', background: '#0891b2', color: '#041017', fontWeight: 'bold', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '13px' }}
          >
            Reload Forecast Engine
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

