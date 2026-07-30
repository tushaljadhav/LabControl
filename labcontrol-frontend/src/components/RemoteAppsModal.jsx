/**
 * RemoteAppsModal.jsx — Remote Application Launch & Close Modal
 *
 * Allows lab admins to remotely launch utilities (Calculator, Chrome, Notepad, CMD, custom executables)
 * or terminate background processes across selected or all lab PCs.
 */

import { useState } from 'react'
import { X, Play, Square, Rocket, Globe, FileText, Terminal, Folder, Palette, CheckCircle2, AlertCircle, Laptop, Search, Cpu, AppWindow } from 'lucide-react'

const LAUNCH_PRESETS = [
  { name: 'Calculator', exe: 'calc.exe', icon: Rocket, bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { name: 'Notepad', exe: 'notepad.exe', icon: FileText, bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  { name: 'Chrome', exe: 'chrome.exe', icon: Globe, bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { name: 'Command Prompt', exe: 'cmd.exe', icon: Terminal, bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  { name: 'File Explorer', exe: 'explorer.exe', icon: Folder, bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { name: 'MS Paint', exe: 'mspaint.exe', icon: Palette, bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
]

const CLOSE_PRESETS = [
  { name: 'Close Chrome', process: 'chrome.exe', icon: Globe },
  { name: 'Close Notepad', process: 'notepad.exe', icon: FileText },
  { name: 'Close CMD', process: 'cmd.exe', icon: Terminal },
  { name: 'Close MS Paint', process: 'mspaint.exe', icon: Palette },
]

export default function RemoteAppsModal({
  isOpen,
  onClose,
  selectedCount,
  selectedIds,
  pcs = [],
  apiBase,
  onActionComplete
}) {
  const [activeTab, setActiveTab] = useState('launch') // 'launch' or 'close'
  const [customPath, setCustomPath] = useState('')
  const [customProcess, setCustomProcess] = useState('')
  const [targetScope, setTargetScope] = useState(selectedCount > 0 ? 'selected' : 'all')

  const [installedApps, setInstalledApps] = useState([])
  const [scanningApps, setScanningApps] = useState(false)
  const [appSearch, setAppSearch] = useState('')
  const [showAppList, setShowAppList] = useState(false)

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const targetPcIds = targetScope === 'selected' && selectedCount > 0
    ? Array.from(selectedIds)
    : 'all'

  const targetCountDisplay = targetScope === 'selected' && selectedCount > 0
    ? `${selectedCount} Selected PC(s)`
    : `All ${pcs.length} PC(s)`

  async function handleLaunchApp(appPath) {
    const pathToSend = appPath || customPath
    if (!pathToSend.trim()) {
      setError('Please enter or select an application executable')
      return
    }

    setError('')
    setLoading(true)
    setResults(null)

    try {
      const res = await fetch(`${apiBase}/api/launch-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pc_ids: targetPcIds,
          app_path: pathToSend.trim()
        })
      })

      const data = await res.json()
      if (res.ok) {
        setResults(data.results || [])
        if (onActionComplete) onActionComplete()
      } else {
        setError(data.error || 'Failed to launch application')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseApp(processName) {
    const procToSend = processName || customProcess
    if (!procToSend.trim()) {
      setError('Please enter or select a process name to terminate')
      return
    }

    setError('')
    setLoading(true)
    setResults(null)

    try {
      const res = await fetch(`${apiBase}/api/close-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pc_ids: targetPcIds,
          app_name: procToSend.trim()
        })
      })

      const data = await res.json()
      if (res.ok) {
        setResults(data.results || [])
        if (onActionComplete) onActionComplete()
      } else {
        setError(data.error || 'Failed to close application process')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchInstalledApps() {
    setScanningApps(true)
    setError('')
    try {
      const pcIdToScan = targetScope === 'selected' && selectedCount > 0
        ? Array.from(selectedIds)[0]
        : null

      const res = await fetch(`${apiBase}/api/installed-apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pc_id: pcIdToScan })
      })

      const data = await res.json()
      if (res.ok && data.apps) {
        setInstalledApps(data.apps)
        setShowAppList(true)
      } else {
        setError('Could not fetch installed applications list')
      }
    } catch (err) {
      setError('Failed to scan installed apps: ' + err.message)
    } finally {
      setScanningApps(false)
    }
  }

  const filteredApps = installedApps.filter(a =>
    a.name.toLowerCase().includes(appSearch.toLowerCase()) ||
    a.cmd.toLowerCase().includes(appSearch.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-surface border border-elevated rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-card flex items-center justify-between bg-card/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Rocket size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Remote App Management</h3>
              <p className="text-xs text-slate-400">Launch utilities or terminate background processes across lab PCs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-offline/10 border border-offline/20 text-offline text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Target Scope Selection */}
          <div className="p-3 bg-card border border-elevated rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Laptop size={16} className="text-brand" />
              Target PCs: <span className="text-white font-mono">{targetCountDisplay}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-lg border border-elevated">
              <button
                type="button"
                onClick={() => setTargetScope('selected')}
                disabled={selectedCount === 0}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  targetScope === 'selected' && selectedCount > 0
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-30'
                }`}
              >
                Selected ({selectedCount})
              </button>
              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  targetScope === 'all'
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All PCs ({pcs.length})
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-card">
            <button
              onClick={() => { setActiveTab('launch'); setResults(null); setError('') }}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'launch'
                  ? 'border-brand text-brand bg-brand/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play size={14} /> Launch Application
            </button>

            <button
              onClick={() => { setActiveTab('close'); setResults(null); setError('') }}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'close'
                  ? 'border-red-500 text-red-400 bg-red-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Square size={14} /> Close Process
            </button>
          </div>

          {/* TAB 1: LAUNCH APPLICATION */}
          {activeTab === 'launch' && (
            <div className="space-y-4 animate-in">
              
              {/* Scan Installed Apps Button Banner */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AppWindow size={18} className="text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-purple-300">Don't know app name? Auto-Detect Software!</div>
                    <div className="text-[10px] text-slate-400">Scans all installed applications on the target PC</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchInstalledApps}
                  disabled={scanningApps}
                  className="btn-action bg-purple-600 text-white hover:bg-purple-500 text-xs px-3 py-1.5 shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Search size={14} />
                  {scanningApps ? 'Scanning...' : 'Scan Installed Apps 🔍'}
                </button>
              </div>

              {/* Installed Apps Search & List Dropdown */}
              {showAppList && (
                <div className="p-3 bg-card border border-purple-500/30 rounded-xl space-y-2 animate-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Cpu size={14} /> {installedApps.length} Installed Software Found:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAppList(false)}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Hide List
                    </button>
                  </div>

                  <input
                    type="text"
                    value={appSearch}
                    onChange={e => setAppSearch(e.target.value)}
                    placeholder="Search software (e.g. Photoshop, VS Code, Chrome)..."
                    className="input-field text-xs mb-2"
                  />

                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {filteredApps.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2 text-center">No matching app found.</div>
                    ) : (
                      filteredApps.map((a, idx) => (
                        <div
                          key={idx}
                          onClick={() => { setCustomPath(a.cmd); handleLaunchApp(a.cmd) }}
                          className="p-2 rounded-lg bg-surface border border-elevated hover:border-purple-500/50 hover:bg-purple-500/10 flex items-center justify-between cursor-pointer transition-all text-xs"
                        >
                          <span className="font-semibold text-slate-200">{a.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {a.cmd}
                            </span>
                            <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded font-bold">
                              Launch 🚀
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider block">Quick Presets</span>

              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {LAUNCH_PRESETS.map(preset => {
                  const Icon = preset.icon
                  return (
                    <button
                      key={preset.exe}
                      onClick={() => handleLaunchApp(preset.exe)}
                      disabled={loading}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-40 ${preset.bg}`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <div>
                        <div className="text-xs font-bold">{preset.name}</div>
                        <div className="text-[10px] opacity-75 font-mono">{preset.exe}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Custom Executable Form */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Custom Executable Name or Full Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPath}
                    onChange={e => setCustomPath(e.target.value)}
                    placeholder="e.g. mspaint.exe or C:\Apps\app.exe"
                    className="input-field flex-1 text-xs font-mono"
                  />
                  <button
                    onClick={() => handleLaunchApp(customPath)}
                    disabled={loading || !customPath.trim()}
                    className="btn-primary text-xs px-4 whitespace-nowrap"
                  >
                    {loading ? 'Launching...' : 'Launch App'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLOSE PROCESS */}
          {activeTab === 'close' && (
            <div className="space-y-4 animate-in">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Quick Close Presets</span>

              {/* Presets Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {CLOSE_PRESETS.map(preset => {
                  const Icon = preset.icon
                  return (
                    <button
                      key={preset.process}
                      onClick={() => handleCloseApp(preset.process)}
                      disabled={loading}
                      className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 flex items-center gap-2.5 text-left transition-all hover:bg-red-500/20 cursor-pointer disabled:opacity-40"
                    >
                      <Icon size={18} className="shrink-0 text-red-400" />
                      <div>
                        <div className="text-xs font-bold">{preset.name}</div>
                        <div className="text-[10px] opacity-75 font-mono">{preset.process}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Custom Process Form */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Custom Process Name to Terminate
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customProcess}
                    onChange={e => setCustomProcess(e.target.value)}
                    placeholder="e.g. chrome.exe or notepad"
                    className="input-field flex-1 text-xs font-mono"
                  />
                  <button
                    onClick={() => handleCloseApp(customProcess)}
                    disabled={loading || !customProcess.trim()}
                    className="btn-action bg-red-600 text-white hover:bg-red-700 text-xs px-4 whitespace-nowrap"
                  >
                    {loading ? 'Closing...' : 'Close Process'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Execution Results Feed */}
          {results && results.length > 0 && (
            <div className="mt-4 p-3 bg-card border border-elevated rounded-xl space-y-2 animate-in">
              <span className="text-xs font-bold text-slate-300">Execution Results:</span>
              <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-xs">
                {results.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1 border-b border-card/40 last:border-0">
                    <span className="text-slate-300">{r.name} ({r.ip}):</span>
                    <span className={r.status === 'success' ? 'text-emerald-400 font-semibold' : 'text-offline font-semibold'}>
                      {r.message || r.detail || r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-card bg-card/30 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
