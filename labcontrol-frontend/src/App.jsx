/**
 * App.jsx — Root component of the LabControl Dashboard
 *
 * Integrates ErrorBoundary, ThemeProvider, AuthProvider, LoginPage, SecurityModal, and the main responsive dashboard layout.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from './components/ThemeContext'
import { AuthProvider, useAuth } from './components/AuthContext'
import LoginPage from './components/LoginPage'
import Sidebar from './components/Sidebar'
import LabDashboard from './components/LabDashboard'
import SecurityModal from './components/SecurityModal'
import { RefreshCw } from 'lucide-react'

/* The Flask API base URL */
const API_BASE = 'http://localhost:8080'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-lg space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-red-400">Application Rendering Error</h2>
            <p className="text-xs font-mono bg-slate-900 p-3 rounded text-red-300 overflow-x-auto text-left whitespace-pre-wrap">
              {this.state.error?.toString() || 'Unknown React Error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function MainContent() {
  const { user, loading } = useAuth()
  const [selectedLabId, setSelectedLabId] = useState(null)
  const [labs, setLabs] = useState([])
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const fetchLabs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/labs`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setLabs(data)
      }
    } catch (err) {
      console.error('Failed to fetch labs:', err)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchLabs()
    }
  }, [user, fetchLabs])

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-brand" />
        <span className="text-sm font-semibold">Loading LabControl...</span>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Left sidebar — lab navigation, drawer on mobile */}
      <Sidebar
        labs={labs}
        selectedLabId={selectedLabId}
        onSelectLab={setSelectedLabId}
        onLabsChanged={fetchLabs}
        onOpenSecurity={() => setShowSecurityModal(true)}
        apiBase={API_BASE}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content — PC dashboard for the selected lab */}
      <LabDashboard
        selectedLabId={selectedLabId}
        labs={labs}
        apiBase={API_BASE}
        onLabsChanged={fetchLabs}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* 2FA Security Settings Modal */}
      <SecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        apiBase={API_BASE}
      />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider apiBase={API_BASE}>
          <MainContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
