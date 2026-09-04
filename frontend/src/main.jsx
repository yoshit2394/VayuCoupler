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
    console.error("VayuCoupler App Auto-Recovery:", error, errorInfo);
    try {
      localStorage.removeItem('vayucoupler_user_location');
    } catch (_) {}
    // Automatically auto-reload and recover without requiring user to press any reload button
    setTimeout(() => {
      try {
        window.location.reload();
      } catch (_) {}
    }, 1100);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#050912', color: '#00F0FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'monospace', textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(0, 240, 255, 0.2)', borderTopColor: '#00F0FF', animation: 'spin 0.9s linear infinite', marginBottom: '20px' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
            SIH26082 • MoES Coupled Telemetry
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: '#E2F8FF' }}>
            VayuCoupler Atmospheric Engine
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '13px', maxWidth: '420px', lineHeight: '1.6' }}>
            Synchronizing coupled telemetry from MoES... Auto-loading interface...
          </p>
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

