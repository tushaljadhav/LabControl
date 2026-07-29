/**
 * SecurityModal.jsx — 2FA Security Settings Modal
 *
 * Allows users to enable 2FA via QR Code scan or disable 2FA with password confirmation.
 */

import { useState } from 'react'
import { ShieldCheck, ShieldAlert, QrCode, KeyRound, Lock, CheckCircle, Copy, AlertCircle, X } from 'lucide-react'
import { useAuth } from './AuthContext'

export default function SecurityModal({ isOpen, onClose, apiBase }) {
  const { user, refreshUser } = useAuth()

  // Setup state
  const [setupData, setSetupData] = useState(null) // { qr_code, secret }
  const [totpCode, setTotpCode] = useState('')
  
  // Disable state
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showDisableForm, setShowDisableForm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // 1. Generate 2FA Secret & QR Code
  async function handleStartSetup() {
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const res = await fetch(`${apiBase}/api/2fa/setup`, {
        method: 'POST',
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSetupData(data)
      } else {
        setError(data.error || 'Failed to initialize 2FA setup')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 2. Confirm 6-Digit TOTP Code to Enable 2FA
  async function handleConfirm2FA(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!totpCode.trim()) {
      setError('Please enter the 6-digit verification code')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/2fa/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: totpCode.trim() })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg('Two-Factor Authentication has been successfully ENABLED!')
        setSetupData(null)
        setTotpCode('')
        await refreshUser()
      } else {
        setError(data.error || 'Invalid verification code')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 3. Disable 2FA with Password Confirmation
  async function handleDisable2FA(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!confirmPassword) {
      setError('Please enter your password to confirm')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: confirmPassword })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg('Two-Factor Authentication has been DISABLED.')
        setShowDisableForm(false)
        setConfirmPassword('')
        await refreshUser()
      } else {
        setError(data.error || 'Incorrect password')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCopySecret() {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleCloseModal() {
    setSetupData(null)
    setTotpCode('')
    setShowDisableForm(false)
    setConfirmPassword('')
    setError('')
    setSuccessMsg('')
    onClose()
  }

  const is2FAEnabled = user?.two_factor_enabled

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-elevated rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in relative">
        
        {/* Close Icon */}
        <button
          onClick={handleCloseModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-hover transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-3 border-b border-card pb-4">
          <div className={`p-2.5 rounded-xl border ${is2FAEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-brand/10 text-brand border-brand/20'}`}>
            {is2FAEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Security Settings</h2>
            <p className="text-xs text-slate-400">Manage Two-Factor Authentication (2FA) for {user?.username}</p>
          </div>
        </div>

        {/* Notification Banners */}
        {error && (
          <div className="p-3 rounded-xl bg-offline/10 border border-offline/20 text-offline text-xs flex items-center gap-2 animate-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in">
            <CheckCircle size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── CASE 1: 2FA IS ALREADY ENABLED ─────────────────────────── */}
        {is2FAEnabled ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle size={24} className="text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-emerald-300">2FA Protection Active</div>
                <div className="text-xs text-emerald-200/80">Your account is secured with TOTP authenticator verification.</div>
              </div>
            </div>

            {!showDisableForm ? (
              <button
                onClick={() => { setError(''); setShowDisableForm(true) }}
                className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <ShieldAlert size={16} /> Disable Two-Factor Authentication
              </button>
            ) : (
              <form onSubmit={handleDisable2FA} className="p-4 rounded-xl bg-surface border border-card space-y-3">
                <h4 className="text-xs font-bold text-red-400 uppercase">Confirm Password to Disable 2FA</h4>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="input-field pl-9 text-xs"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Disabling...' : 'Confirm & Disable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDisableForm(false); setConfirmPassword(''); setError('') }}
                    className="px-3 py-2 rounded-lg bg-elevated hover:bg-hover text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* ── CASE 2: 2FA IS NOT ENABLED YET ─────────────────────────── */
          <div className="space-y-4">
            {!setupData ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Two-factor authentication adds an extra layer of security to your LabControl account. Once enabled, you'll enter both your password and a 6-digit security code generated by an app like Google Authenticator or Authy.
                </p>

                <button
                  onClick={handleStartSetup}
                  disabled={loading}
                  className="w-full btn-primary justify-center py-2.5 text-xs font-bold shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Generating Secret...' : 'Set Up Two-Factor Authentication'}
                </button>
              </div>
            ) : (
              /* ── STEP 2: QR Code Scan & Confirmation Form ──────────── */
              <div className="space-y-4 animate-in">
                <div className="text-xs font-semibold text-slate-300">
                  1. Scan this QR Code with your Authenticator App (Google Authenticator, Authy, etc.):
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/95 border border-white/20 shadow-xl max-w-xs mx-auto">
                  <img src={setupData.qr_code} alt="2FA QR Code" className="w-44 h-44 rounded-lg" />
                </div>

                {/* Backup Secret Key */}
                <div className="p-3 rounded-xl bg-surface border border-card space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Backup Secret Key (If unable to scan)</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-brand font-bold tracking-wider select-all truncate">{setupData.secret}</span>
                    <button
                      onClick={handleCopySecret}
                      className="p-1 rounded hover:bg-hover text-slate-400 hover:text-white transition-colors"
                      title="Copy Secret"
                    >
                      {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* 6-Digit Confirmation Input Form */}
                <form onSubmit={handleConfirm2FA} className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300">
                    2. Enter the 6-digit code shown in your app to confirm setup:
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <KeyRound size={16} />
                    </span>
                    <input
                      type="text"
                      maxLength={6}
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="input-field pl-9 font-mono tracking-widest text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 btn-primary justify-center py-2.5 text-xs font-bold shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Confirm & Enable 2FA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSetupData(null); setTotpCode(''); setError('') }}
                      className="px-3 py-2 rounded-lg bg-elevated hover:bg-hover text-slate-300 font-semibold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-2 border-t border-card flex justify-end">
          <button
            onClick={handleCloseModal}
            className="px-4 py-2 rounded-lg bg-elevated hover:bg-hover text-slate-300 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
