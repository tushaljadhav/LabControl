/**
 * LoginPage.jsx — LabControl Admin Login & 2FA Step-2 Screen
 */

import { useState } from 'react'
import { ShieldCheck, Lock, User, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const { login, verify2FA, awaiting2FA, cancel2FA } = useAuth()
  
  // Step 1 state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
  // Step 2 state (2FA)
  const [totpCode, setTotpCode] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLoginSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await login(username, password)
      if (!res.success) {
        setError(res.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handle2FASubmit(e) {
    e.preventDefault()
    if (!totpCode.trim() || totpCode.length !== 6) {
      setError('Please enter a 6-digit TOTP code')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await verify2FA(totpCode)
      if (!res.success) {
        setError(res.error || 'Invalid code')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="bg-card border border-elevated rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6 animate-in">
        
        {/* Header Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-brand/15 text-brand border border-brand/25 shadow-lg">
            {awaiting2FA ? <KeyRound size={36} /> : <ShieldCheck size={36} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {awaiting2FA ? 'Two-Factor Authentication' : 'LabControl Admin'}
          </h1>
          <p className="text-xs text-slate-400">
            {awaiting2FA
              ? 'Enter the 6-digit verification code from your authenticator app (Google Authenticator / Authy)'
              : 'Enter your credentials to access the management dashboard'}
          </p>
        </div>

        {/* Form rendering based on awaiting2FA */}
        {!awaiting2FA ? (
          /* ── STEP 1: Username & Password Form ─────────────────────── */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Username</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 pointer-events-none text-slate-400 z-10 flex items-center justify-center">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  style={{ paddingLeft: '2.6rem' }}
                  className="input-field pr-4 py-2.5"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Password</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 pointer-events-none text-slate-400 z-10 flex items-center justify-center">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: '2.6rem' }}
                  className="input-field pr-4 py-2.5"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-offline/10 border border-offline/20 text-offline text-xs flex items-center gap-2 animate-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-sm font-bold shadow-lg disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Log In'}
            </button>
          </form>
        ) : (
          /* ── STEP 2: 6-Digit TOTP Verification Form ──────────────── */
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 text-center">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="input-field text-center text-2xl font-mono tracking-widest py-3"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-offline/10 border border-offline/20 text-offline text-xs flex items-center gap-2 animate-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-sm font-bold shadow-lg disabled:opacity-50 mt-2"
            >
              {loading ? 'Verifying Code...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={cancel2FA}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1"
            >
              <ArrowLeft size={14} /> Back to Username Login
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-elevated text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            LabControl Remote Management & System Control
          </p>
        </div>
      </div>
    </div>
  )
}
