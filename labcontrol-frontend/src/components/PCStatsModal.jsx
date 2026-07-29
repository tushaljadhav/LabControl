/**
 * PCStatsModal.jsx — Premium Glassmorphism Modal for Live System Performance Metrics
 *
 * Displays CPU %, Cores, RAM, Disk, Active OS User, OS Info, Process Count, Network I/O, and Uptime.
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Cpu, HardDrive, Server, Clock, RefreshCw, Layers, ShieldCheck, User, Monitor, Wifi, Activity } from 'lucide-react'

export default function PCStatsModal({ isOpen, onClose, pc, apiBase }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchLiveStats = useCallback(async () => {
    if (!pc) return
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pc_ids: [pc.id] })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.stats && data.stats[pc.id]) {
          setStats(data.stats[pc.id])
        }
      }
    } catch (err) {
      console.error('Failed to fetch PC live stats:', err)
    } finally {
      setLoading(false)
    }
  }, [pc, apiBase])

  useEffect(() => {
    if (isOpen && pc) {
      fetchLiveStats()
      const interval = setInterval(fetchLiveStats, 3000)
      return () => clearInterval(interval)
    }
  }, [isOpen, pc, fetchLiveStats])

  if (!isOpen || !pc) return null

  const getStatusBadge = (pct) => {
    if (pct > 85) return 'text-red-400 bg-red-500/15 border-red-500/30'
    if (pct > 60) return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
  }

  const getBarColor = (pct) => {
    if (pct > 85) return 'bg-gradient-to-r from-red-500 to-rose-400'
    if (pct > 60) return 'bg-gradient-to-r from-amber-500 to-amber-400'
    return 'bg-gradient-to-r from-emerald-500 to-teal-400'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-surface border border-elevated rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-card flex items-center justify-between bg-card/40">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-brand/15 text-brand border border-brand/20 shadow-inner">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {pc.name}
                <span className="text-xs font-mono font-normal text-slate-400">({pc.ip})</span>
              </h3>
              <p className="text-xs text-slate-400">Live System Performance & Hardware Resource Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveStats}
              disabled={loading}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-elevated transition-colors"
              title="Refresh Live Metrics"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin text-brand' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-elevated transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {pc.status === 'offline' ? (
            <div className="p-10 text-center bg-card border border-elevated rounded-xl">
              <Server size={36} className="mx-auto text-slate-600 mb-2" />
              <p className="text-base font-bold text-slate-300">Target PC is Offline</p>
              <p className="text-xs text-slate-500 mt-1">Live metrics cannot be fetched while the PC is disconnected.</p>
            </div>
          ) : !stats ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw size={32} className="mx-auto animate-spin text-brand" />
              <p className="text-xs font-medium">Connecting to PC agent & fetching live hardware metrics...</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Top Overview Grid — User, OS, Processes, Uptime */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Active User */}
                <div className="p-3 bg-card border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <User size={13} className="text-brand" /> Active User
                  </div>
                  <div className="text-sm font-bold text-white truncate font-mono">
                    {stats.logged_user || 'Admin'}
                  </div>
                </div>

                {/* OS Version */}
                <div className="p-3 bg-card border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Monitor size={13} className="text-indigo-400" /> OS Platform
                  </div>
                  <div className="text-sm font-bold text-white truncate font-mono">
                    {stats.os_info || 'Windows'}
                  </div>
                </div>

                {/* Active Processes */}
                <div className="p-3 bg-card border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Activity size={13} className="text-emerald-400" /> Processes
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {stats.process_count || 0} <span className="text-[11px] font-normal text-slate-400">running</span>
                  </div>
                </div>

                {/* Boot Uptime */}
                <div className="p-3 bg-card border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Clock size={13} className="text-amber-400" /> Boot Uptime
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {stats.uptime_hours !== undefined ? `${stats.uptime_hours}h` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Metric Rows List */}
              <div className="space-y-3.5">
                
                {/* 1. CPU Row */}
                <div className="p-4 bg-card border border-elevated rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-brand" />
                      <span className="text-sm font-bold text-slate-200">CPU Load</span>
                      {stats.cpu_cores && (
                        <span className="text-xs px-2 py-0.5 rounded bg-elevated text-slate-400 font-mono">
                          {stats.cpu_cores} Cores
                        </span>
                      )}
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${getStatusBadge(stats.cpu_usage)}`}>
                      {Math.round(stats.cpu_usage)}%
                    </span>
                  </div>

                  <div className="h-3 bg-elevated rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(stats.cpu_usage)}`}
                      style={{ width: `${Math.min(100, Math.max(0, stats.cpu_usage))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Processor Utilization</span>
                    <span>Live Load: <strong className="text-slate-200">{stats.cpu_usage}%</strong></span>
                  </div>
                </div>

                {/* 2. RAM Row */}
                <div className="p-4 bg-card border border-elevated rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-indigo-400" />
                      <span className="text-sm font-bold text-slate-200">RAM Memory</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${getStatusBadge(stats.ram_usage)}`}>
                      {Math.round(stats.ram_usage)}%
                    </span>
                  </div>

                  <div className="h-3 bg-elevated rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(stats.ram_usage)}`}
                      style={{ width: `${Math.min(100, Math.max(0, stats.ram_usage))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Used: <strong className="text-slate-200">{stats.ram_used_gb} GB</strong></span>
                    <span>Total: <strong className="text-slate-200">{stats.ram_total_gb} GB</strong></span>
                    <span>Available: <strong className="text-slate-200">{round1(stats.ram_total_gb - stats.ram_used_gb)} GB</strong></span>
                  </div>
                </div>

                {/* 3. Disk Storage Row */}
                <div className="p-4 bg-card border border-elevated rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive size={16} className="text-emerald-400" />
                      <span className="text-sm font-bold text-slate-200">Disk Storage (C:)</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${getStatusBadge(stats.disk_usage)}`}>
                      {Math.round(stats.disk_usage)}%
                    </span>
                  </div>

                  <div className="h-3 bg-elevated rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(stats.disk_usage)}`}
                      style={{ width: `${Math.min(100, Math.max(0, stats.disk_usage))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Used: <strong className="text-slate-200">{stats.disk_used_gb} GB</strong></span>
                    <span>Total: <strong className="text-slate-200">{stats.disk_total_gb} GB</strong></span>
                    <span>Free: <strong className="text-slate-200">{round1(stats.disk_total_gb - stats.disk_used_gb)} GB</strong></span>
                  </div>
                </div>

                {/* 4. Network Bandwidth Data */}
                {stats.net_sent_mb !== undefined && (
                  <div className="p-3 bg-card/60 border border-elevated rounded-xl flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Wifi size={15} className="text-cyan-400" />
                      <span className="text-slate-400 font-sans font-medium">Network Data I/O:</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-300">
                      <span>Received (Rx): <strong className="text-emerald-400">{stats.net_recv_mb} MB</strong></span>
                      <span>Sent (Tx): <strong className="text-indigo-400">{stats.net_sent_mb} MB</strong></span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-card bg-card/30 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-5">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function round1(val) {
  const n = parseFloat(val)
  return isNaN(n) ? '0' : Math.max(0, n).toFixed(1)
}
