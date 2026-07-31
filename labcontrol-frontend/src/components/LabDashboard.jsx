/**
 * LabDashboard.jsx — Main content area
 *
 * Managing PC/log data, auto-refresh, selection, power commands,
 * Wake-on-LAN (WOL) triggers, 2-stage safety flow, and PC edit/delete handlers.
 * Updated with credentials: 'include' and automatic 401 unauthorized handling.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, AlertOctagon, XCircle, Send, CheckCircle, AlertTriangle, Menu, Sparkles, Sliders } from 'lucide-react'
import { useAuth } from './AuthContext'
import SummaryCards from './SummaryCards'
import ActionToolbar from './ActionToolbar'
import PCTable from './PCTable'
import ActivityLog from './ActivityLog'
import AddPCModal from './AddPCModal'
import EditPCModal from './EditPCModal'
import ConfirmActionModal from './ConfirmActionModal'
import WOLHelpModal from './WOLHelpModal'
import SchedulesModal from './SchedulesModal'
import PCStatsModal from './PCStatsModal'
import RemoteAppsModal from './RemoteAppsModal'
import DeployFilesModal from './DeployFilesModal'

export default function LabDashboard({ selectedLabId, labs, apiBase, onLabsChanged, onOpenMobileMenu }) {
  const { logout } = useAuth()
  
  // ── State ───────────────────────────────────────────────────────────
  const [pcs, setPcs] = useState([])
  const [logs, setLogs] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [showAddPC, setShowAddPC] = useState(false)
  const [editingPC, setEditingPC] = useState(null)
  const [selectedStatsPC, setSelectedStatsPC] = useState(null)
  const [showWOLHelp, setShowWOLHelp] = useState(false)
  const [showSchedulesModal, setShowSchedulesModal] = useState(false)
  const [showAppsModal, setShowAppsModal] = useState(false)
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [sending, setSending] = useState(false)
  const [toastNotification, setToastNotification] = useState(null)

  // Stage 1: 10-second Admin Dashboard countdown before transmitting command
  const [stagedCommand, setStagedCommand] = useState(null)

  const [systemStats, setSystemStats] = useState({})
  const refreshTimerRef = useRef(null)

  // Helper fetch with 401 handling & credentials
  const authFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      credentials: 'include'
    })
    if (res.status === 401) {
      logout()
      throw new Error('Session expired. Please log in again.')
    }
    return res
  }, [logout])

  // ── Fetch System Stats ──────────────────────────────────────────────
  const fetchSystemStats = useCallback(async () => {
    try {
      const res = await authFetch(`${apiBase}/api/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pc_ids: 'all' })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.stats) {
          setSystemStats(prev => ({ ...prev, ...data.stats }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch system stats:', err)
    }
  }, [apiBase, authFetch])

  // ── Fetch PCs ───────────────────────────────────────────────────────
  const fetchPCs = useCallback(async () => {
    try {
      const url = selectedLabId
        ? `${apiBase}/api/pcs?lab_id=${selectedLabId}`
        : `${apiBase}/api/pcs`
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setPcs(data)
        setLastRefresh(Date.now())
      }
    } catch (err) {
      console.error('Failed to fetch PCs:', err)
    }
  }, [apiBase, selectedLabId, authFetch])

  // ── Fetch Logs ──────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      const url = selectedLabId
        ? `${apiBase}/api/logs?lab_id=${selectedLabId}`
        : `${apiBase}/api/logs`
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }, [apiBase, selectedLabId, authFetch])

  const handleClearLogs = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete all activity logs?')) return
    try {
      const res = await authFetch(`${apiBase}/api/logs`, { method: 'DELETE' })
      if (res.ok) {
        fetchLogs()
      }
    } catch (err) {
      console.error('Failed to clear logs:', err)
    }
  }, [apiBase, authFetch, fetchLogs])

  // ── Auto-refresh ────────────────────────────────────────────────────
  useEffect(() => {
    fetchPCs()
    fetchLogs()
    fetchSystemStats()

    refreshTimerRef.current = setInterval(() => {
      fetchPCs()
      fetchLogs()
      fetchSystemStats()
    }, 5000)

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [fetchPCs, fetchLogs, fetchSystemStats])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [selectedLabId])

  // ── Send Actual Command to Backend API (Stage 2) ───────────────────
  const sendActualCommand = useCallback(async (command, targetIds) => {
    setSending(true)
    try {
      const res = await authFetch(`${apiBase}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, pc_ids: targetIds })
      })
      await res.json()
      fetchPCs()
      fetchLogs()
      onLabsChanged()
    } catch (err) {
      console.error('Command transmission failed:', err)
    } finally {
      setSending(false)
    }
  }, [apiBase, fetchPCs, fetchLogs, onLabsChanged, authFetch])

  // ── Wake-on-LAN Trigger (Safe Action - Immediate Transmission) ─────
  async function handleWakeSelected() {
    if (selectedIds.size === 0) return

    setSending(true)
    try {
      const targetIds = Array.from(selectedIds)
      const res = await authFetch(`${apiBase}/api/wake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pc_ids: targetIds })
      })

      const data = await res.json()
      const successCount = data.summary?.success || 0
      const errorCount = data.summary?.error || 0

      if (errorCount > 0 && successCount === 0) {
        setToastNotification({
          type: 'warning',
          title: 'Wake Signal Warning',
          message: `MAC address not set for selected PC(s). Edit PC details to add MAC address.`
        })
      } else {
        setToastNotification({
          type: 'success',
          title: 'Wake Signal Sent',
          message: `Wake-on-LAN Magic Packet sent to ${successCount} PC(s)${errorCount > 0 ? ` (${errorCount} skipped - no MAC)` : ''}.`
        })
      }

      fetchLogs()
      onLabsChanged()
    } catch (err) {
      setToastNotification({
        type: 'warning',
        title: 'Wake Error',
        message: 'Failed to send Wake signal: ' + err.message
      })
    } finally {
      setSending(false)
    }
  }

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toastNotification) {
      const t = setTimeout(() => setToastNotification(null), 5000)
      return () => clearTimeout(t)
    }
  }, [toastNotification])

  // ── Stage 1: 10-Second Admin Dashboard Countdown Timer Effect ─────
  useEffect(() => {
    if (!stagedCommand) return

    const timer = setInterval(() => {
      setStagedCommand(prev => {
        if (!prev) return null

        if (prev.secondsLeft <= 1) {
          sendActualCommand(prev.command, prev.targetIds)
          return null
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stagedCommand, sendActualCommand])

  // ── Selection handlers ──────────────────────────────────────────────
  function toggleSelect(pcId) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(pcId)) next.delete(pcId)
      else next.add(pcId)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(pcs.map(pc => pc.id)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  // ── PC Edit / Delete Handlers ───────────────────────────────────────
  async function handleDeletePC(pc) {
    if (!window.confirm(`Are you sure you want to delete PC "${pc.name}" (${pc.ip})?`)) return

    try {
      const res = await authFetch(`${apiBase}/api/pcs/${pc.id}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('Failed to delete PC')
        return
      }
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(pc.id)
        return next
      })
      fetchPCs()
      onLabsChanged()
    } catch (err) {
      alert('Error deleting PC: ' + err.message)
    }
  }

  // ── Request Command ────────────────────────────────────────────────
  function requestCommand(command) {
    if (selectedIds.size === 0) return
    setConfirmAction({ command, pcCount: selectedIds.size })
  }

  function executeCommand(command) {
    setConfirmAction(null)
    const targetIds = Array.from(selectedIds)

    if (['shutdown', 'restart', 'sleep'].includes(command)) {
      setStagedCommand({
        command,
        targetIds,
        count: targetIds.length,
        secondsLeft: 10
      })
    } else {
      sendActualCommand(command, targetIds)
    }
  }



  function cancelStagedCommand() {
    setStagedCommand(null)
  }

  async function pingStatus() {
    setSending(true)
    try {
      const pc_ids = selectedIds.size > 0 ? Array.from(selectedIds) : 'all'
      await authFetch(`${apiBase}/api/pcs/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pc_ids })
      })
      await fetchPCs()
      onLabsChanged()
    } catch (err) {
      console.error('Ping status failed:', err)
    } finally {
      setSending(false)
    }
  }

  const currentLab = (labs || []).find(l => l.id === selectedLabId)
  const title = currentLab ? currentLab.name : 'All Labs'
  const subtitle = currentLab?.location || 'Overview of all lab PCs'

  const [secondsAgo, setSecondsAgo] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [lastRefresh])

  const unassignedPCs = pcs.filter(pc => pc.lab_name === 'Unassigned Lab' || !pc.lab_id)

  return (
    <main className="flex-1 overflow-y-auto">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-sm border-b border-card px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-lg bg-elevated hover:bg-hover md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Open menu"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold">{title}</h1>
            <p className="text-xs md:text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-400">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-online animate-pulse-dot" />
            <span>Auto-refresh active</span>
          </div>
          <span className="flex items-center gap-1">
            <RefreshCw size={14} />
            {secondsAgo < 3 ? 'Just now' : `${secondsAgo}s ago`}
          </span>
        </div>
      </header>

      {/* ── Toast Notification Banner ────────────────────────────────── */}
      {toastNotification && (
        <div className={`px-4 md:px-8 py-3 flex items-center justify-between animate-in ${
          toastNotification.type === 'success'
            ? 'bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/15 border-b border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastNotification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <div>
              <span className="font-bold text-sm">{toastNotification.title}: </span>
              <span className="text-xs">{toastNotification.message}</span>
            </div>
          </div>
          <button onClick={() => setToastNotification(null)} className="text-muted hover:text-brand p-1">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* ── Auto-Discovered New PC Notification Banner ──────────────── */}
      {unassignedPCs.length > 0 && (
        <div className="bg-indigo-500/15 border-b border-indigo-500/30 px-4 md:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="font-semibold text-indigo-300 text-sm md:text-base flex items-center gap-2 flex-wrap">
                <span>🔔 {unassignedPCs.length} New Auto-Discovered PC{unassignedPCs.length > 1 ? 's' : ''} Detected!</span>
                <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/25 text-indigo-200 font-mono border border-indigo-500/30">
                  {unassignedPCs[0].name} ({unassignedPCs[0].ip})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                MAC: <span className="font-mono text-indigo-200">{unassignedPCs[0].mac_address || 'Auto-Detected'}</span> — Click to set custom PC name and assign lab.
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditingPC(unassignedPCs[0])}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs md:text-sm hover:bg-indigo-500 transition-colors shadow-md cursor-pointer min-h-[44px] shrink-0"
          >
            <Sliders size={16} /> Configure Name & Lab ✏️
          </button>
        </div>
      )}

      {/* ── Stage 1: Admin Dashboard 10-Second Countdown Banner ───── */}
      {stagedCommand && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 md:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in">
          <div className="flex items-center gap-3">
            <AlertOctagon size={22} className="text-amber-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2 font-semibold text-amber-300 text-sm md:text-base">
                <span>Admin staged {stagedCommand.command.toUpperCase()} on {stagedCommand.count} PC(s)</span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5 flex items-center gap-1">
                <Send size={12} /> Sending command to target PCs in <strong className="text-white text-sm font-mono px-1 bg-amber-500/20 rounded">{stagedCommand.secondsLeft}s</strong> (Admin cancel window)
              </p>
            </div>
          </div>

          <button
            onClick={cancelStagedCommand}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-600 text-white font-bold text-xs md:text-sm hover:bg-red-700 transition-colors shadow-lg cursor-pointer min-h-[44px]"
          >
            <XCircle size={17} /> CANCEL COMMAND (DON'T SEND)
          </button>
        </div>
      )}

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <SummaryCards pcs={pcs} />

        <ActionToolbar
          selectedCount={selectedIds.size}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onCommand={requestCommand}
          onPingStatus={pingStatus}
          onWake={handleWakeSelected}
          onOpenWOLHelp={() => setShowWOLHelp(true)}
          onOpenSchedules={() => setShowSchedulesModal(true)}
          onOpenApps={() => setShowAppsModal(true)}
          onOpenDeploy={() => setShowDeployModal(true)}
          onAddPC={() => setShowAddPC(true)}
          sending={sending}
        />

        <PCTable
          pcs={pcs}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={selectedIds.size === pcs.length && pcs.length > 0 ? deselectAll : selectAll}
          allSelected={selectedIds.size === pcs.length && pcs.length > 0}
          showLabColumn={selectedLabId === null}
          onEditPC={pc => setEditingPC(pc)}
          onDeletePC={handleDeletePC}
          onOpenStats={pc => setSelectedStatsPC(pc)}
        />

        <ActivityLog logs={logs} onRefresh={fetchLogs} onClearLogs={handleClearLogs} />
      </div>

      {/* Add PC Modal */}
      <AddPCModal
        isOpen={showAddPC}
        onClose={() => setShowAddPC(false)}
        onPCAdded={() => { fetchPCs(); onLabsChanged() }}
        labs={labs}
        defaultLabId={selectedLabId}
        apiBase={apiBase}
      />

      {/* Edit PC Modal */}
      <EditPCModal
        isOpen={!!editingPC}
        onClose={() => setEditingPC(null)}
        pc={editingPC}
        labs={labs}
        onPCSaved={() => { fetchPCs(); onLabsChanged() }}
        apiBase={apiBase}
      />

      {/* Live System Metrics Modal */}
      <PCStatsModal
        isOpen={!!selectedStatsPC}
        onClose={() => setSelectedStatsPC(null)}
        pc={selectedStatsPC}
        apiBase={apiBase}
      />

      {/* Remote Apps Launch & Close Modal */}
      <RemoteAppsModal
        isOpen={showAppsModal}
        onClose={() => setShowAppsModal(false)}
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        pcs={pcs}
        apiBase={apiBase}
        onActionComplete={() => { fetchPCs(); fetchLogs() }}
      />

      {/* Deploy Files & Folders Modal */}
      <DeployFilesModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        pcs={pcs}
        apiBase={apiBase}
        onActionComplete={() => { fetchPCs(); fetchLogs() }}
      />

      {/* WOL Setup Guide Modal */}
      <WOLHelpModal
        isOpen={showWOLHelp}
        onClose={() => setShowWOLHelp(false)}
      />

      {/* Scheduled Actions Modal */}
      <SchedulesModal
        isOpen={showSchedulesModal}
        onClose={() => setShowSchedulesModal(false)}
        labs={labs}
        apiBase={apiBase}
      />

      {/* Confirm Action Modal */}
      <ConfirmActionModal
        action={confirmAction}
        onConfirm={executeCommand}
        onCancel={() => setConfirmAction(null)}
      />
    </main>
  )
}

