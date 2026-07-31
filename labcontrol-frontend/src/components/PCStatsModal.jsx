/**
 * PCStatsModal.jsx — Live system hardware & resource metrics modal for LabControl
 *
 * Fetches live metrics from backend API /api/stats for the selected PC.
 * Theme-adaptive for Dark and Light modes.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Cpu,
  Layers,
  HardDrive,
  Activity,
  User,
  Monitor,
  Clock,
  Wifi,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react'

export default function PCStatsModal({ isOpen, onClose, pc, apiBase }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLiveStats = useCallback(async () => {
    if (!pc || !apiBase) return
    setLoading(true)
    setError(null)

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
        } else {
          setStats(null)
          setError('Target PC did not return live metrics')
        }
      } else {
        setStats(null)
        setError('Failed to query PC stats')
      }
    } catch (err) {
      setStats(null)
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [pc, apiBase])

  useEffect(() => {
    let timer = null
    if (isOpen && pc) {
      fetchLiveStats()
      timer = setInterval(() => {
        fetchLiveStats()
      }, 2000)
    } else {
      setStats(null)
      setError(null)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isOpen, pc, fetchLiveStats])

  if (!isOpen || !pc) return null

  function round1(val) {
    if (val === undefined || val === null || isNaN(val)) return '0'
    return Math.max(0, val).toFixed(1)
  }

  function getStatusBadge(val) {
    if (val >= 90) return 'bg-red-500/15 text-red-500 border-red-500/30'
    if (val >= 75) return 'bg-amber-500/15 text-amber-500 border-amber-500/30'
    return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
  }

  function getBarColor(val) {
    if (val >= 90) return 'bg-red-500'
    if (val >= 75) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
      <div className="bg-card border border-card rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-card flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
              <Cpu size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 flex-wrap">
                {pc.name}
                <span className="text-xs font-mono font-normal text-sub">({pc.ip})</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20 font-bold">
                  MAC: {pc.mac_address || 'Not Set'}
                </span>
              </h3>
              <p className="text-xs text-sub">Live System Performance & Hardware Resource Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveStats}
              disabled={loading}
              className="p-2 rounded-lg text-sub hover:text-brand hover:bg-elevated transition-colors cursor-pointer"
              title="Refresh Live Metrics"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin text-brand' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-sub hover:text-brand hover:bg-elevated transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4">
          {loading && !stats ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-sub">
              <RefreshCw size={28} className="animate-spin text-brand" />
              <p className="text-sm font-semibold">Connecting to agent & fetching live stats...</p>
            </div>
          ) : !stats ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
              <AlertTriangle size={36} className="text-amber-400" />
              <p className="text-base font-bold text-sub">Target PC is Offline or Unreachable</p>
              <p className="text-xs text-sub max-w-sm">
                Ensure the LabControl agent is running on {pc.name} ({pc.ip}).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Top Overview Grid — User, OS, Processes, Uptime */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Active User */}
                <div className="p-3 bg-surface border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-sub font-medium mb-1">
                    <User size={13} className="text-brand" /> Active User
                  </div>
                  <div className="text-sm font-bold truncate font-mono">
                    {stats.logged_user || 'Admin'}
                  </div>
                </div>

                {/* OS Version */}
                <div className="p-3 bg-surface border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-sub font-medium mb-1">
                    <Monitor size={13} className="text-indigo-400" /> OS Platform
                  </div>
                  <div className="text-sm font-bold truncate font-mono">
                    {stats.os_info || 'Windows'}
                  </div>
                </div>

                {/* Active Processes */}
                <div className="p-3 bg-surface border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-sub font-medium mb-1">
                    <Activity size={13} className="text-emerald-400" /> Processes
                  </div>
                  <div className="text-sm font-bold font-mono">
                    {stats.process_count || 0} <span className="text-[11px] font-normal text-sub">running</span>
                  </div>
                </div>

                {/* Boot Uptime */}
                <div className="p-3 bg-surface border border-elevated rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-sub font-medium mb-1">
                    <Clock size={13} className="text-amber-400" /> Boot Uptime
                  </div>
                  <div className="text-sm font-bold font-mono">
                    {stats.uptime_hours !== undefined ? `${stats.uptime_hours}h` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Metric Rows List */}
              <div className="space-y-3.5">
                
                {/* 1. CPU Row */}
                <div className="p-4 bg-surface border border-elevated rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-brand" />
                      <span className="text-sm font-bold">CPU Load</span>
                      {stats.cpu_cores && (
                        <span className="text-xs px-2 py-0.5 rounded bg-elevated text-sub font-mono font-medium">
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

                  <div className="flex items-center justify-between text-xs font-mono text-sub">
                    <span>Processor Utilization</span>
                    <span>Live Load: <strong className="font-bold">{stats.cpu_usage}%</strong></span>
                  </div>
                </div>

                {/* 2. RAM Row */}
                <div className="p-4 bg-surface border border-elevated rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-indigo-400" />
                      <span className="text-sm font-bold">RAM Memory</span>
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

                  <div className="flex items-center justify-between text-xs font-mono text-sub">
                    <span>Used: <strong className="font-bold">{stats.ram_used_gb} GB</strong></span>
                    <span>Total: <strong className="font-bold">{stats.ram_total_gb} GB</strong></span>
                    <span>Available: <strong className="font-bold">{round1(stats.ram_total_gb - stats.ram_used_gb)} GB</strong></span>
                  </div>
                </div>

                {/* 3. Disk Storage Row */}
                <div className="p-4 bg-surface border border-elevated rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive size={16} className="text-emerald-400" />
                      <span className="text-sm font-bold">Disk Storage (C:)</span>
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

                  <div className="flex items-center justify-between text-xs font-mono text-sub">
                    <span>Used: <strong className="font-bold">{stats.disk_used_gb} GB</strong></span>
                    <span>Total: <strong className="font-bold">{stats.disk_total_gb} GB</strong></span>
                    <span>Free: <strong className="font-bold">{round1(stats.disk_total_gb - stats.disk_used_gb)} GB</strong></span>
                  </div>
                </div>

                {/* 4. Network Bandwidth Data */}
                {stats.net_sent_mb !== undefined && (
                  <div className="p-3 bg-surface border border-elevated rounded-xl flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-sub">
                      <Wifi size={15} className="text-cyan-400" />
                      <span className="text-sub font-sans font-medium">Network Data I/O:</span>
                    </div>

                    <div className="flex items-center gap-4 text-sub">
                      <span>Received (Rx): <strong className="text-emerald-500">{stats.net_recv_mb} MB</strong></span>
                      <span>Sent (Tx): <strong className="text-indigo-400">{stats.net_sent_mb} MB</strong></span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-card bg-surface flex justify-end">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
