/**
 * ActionToolbar.jsx — Modern, sleek, organized Action Control Deck for LabControl
 */

import { useState, useRef, useEffect } from 'react'
import {
  Power,
  RotateCcw,
  Moon,
  PlusCircle,
  Activity,
  Zap,
  HelpCircle,
  Clock,
  Rocket,
  Package,
  CheckSquare,
  Square,
  ChevronDown,
  Sparkles
} from 'lucide-react'

export default function ActionToolbar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onCommand,
  onPingStatus,
  onWake,
  onOpenWOLHelp,
  onOpenSchedules,
  onOpenApps,
  onOpenDeploy,
  onAddPC,
  sending
}) {
  const [showPowerMenu, setShowPowerMenu] = useState(false)
  const powerMenuRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (powerMenuRef.current && !powerMenuRef.current.contains(e.target)) {
        setShowPowerMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-card border border-card rounded-2xl p-3 md:p-4 shadow-sm space-y-3.5 animate-in">
      {/* ── Row 1: Selection Status & Quick Actions ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-elevated pb-3">
        
        {/* Left: Selection Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex rounded-xl bg-surface p-1 border border-elevated shadow-inner">
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-hover transition-colors cursor-pointer"
            >
              <CheckSquare size={14} className="text-brand" /> Select All
            </button>
            <button
              onClick={onDeselectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-hover text-sub transition-colors cursor-pointer"
            >
              <Square size={14} /> Deselect
            </button>
          </div>

          {selectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand/15 text-brand border border-brand/30 animate-in">
              <Sparkles size={12} /> {selectedCount} PC{selectedCount !== 1 ? 's' : ''} Selected
            </span>
          ) : (
            <span className="text-xs text-sub font-medium px-1">
              Select PCs to execute commands
            </span>
          )}
        </div>

        {/* Right: Add PC & Help */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenWOLHelp}
            className="p-2 rounded-xl text-sub hover:text-brand hover:bg-elevated transition-colors cursor-pointer"
            title="Wake-on-LAN Setup Guide"
          >
            <HelpCircle size={18} />
          </button>

          <button
            onClick={onAddPC}
            className="btn-primary py-2 px-3.5 text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle size={15} /> Add PC
          </button>
        </div>
      </div>

      {/* ── Row 2: Categorized Action Toolbar Buttons ────────────────────────────── */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        
        {/* Category 1: Network & Monitoring */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onPingStatus}
            disabled={sending}
            className="btn-action px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-40"
            title="Check online/offline health status"
          >
            <Activity size={14} /> Check Status
          </button>

          <button
            onClick={onWake}
            disabled={selectedCount === 0 || sending}
            className="btn-action px-3 py-2 text-xs font-semibold rounded-xl bg-teal-500/10 border-teal-500/25 text-teal-400 hover:bg-teal-500/20 disabled:opacity-40"
            title="Send Magic Packet to wake selected PCs"
          >
            <Zap size={14} /> Wake Selected
          </button>
        </div>

        {/* Category 2: Management & Automation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenDeploy}
            className="btn-action px-3 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 border-amber-500/25 text-amber-500 hover:bg-amber-500/20"
            title="Deploy files or folders to target PCs"
          >
            <Package size={14} /> Deploy Files
          </button>

          <button
            onClick={onOpenApps}
            className="btn-action px-3 py-2 text-xs font-semibold rounded-xl bg-purple-500/10 border-purple-500/25 text-purple-400 hover:bg-purple-500/20"
            title="Launch or close applications remotely"
          >
            <Rocket size={14} /> Remote Apps
          </button>

          <button
            onClick={onOpenSchedules}
            className="btn-action px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-500/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20"
            title="Schedule automated shutdown/restart tasks"
          >
            <Clock size={14} /> Schedules
          </button>
        </div>

        {/* Category 3: Unified Power Controls */}
        <div className="relative shrink-0" ref={powerMenuRef}>
          <div className="inline-flex rounded-xl bg-surface p-1 border border-elevated shadow-sm">
            <button
              onClick={() => onCommand('shutdown')}
              disabled={selectedCount === 0 || sending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Power size={14} /> Shutdown
            </button>
            <button
              onClick={() => onCommand('restart')}
              disabled={selectedCount === 0 || sending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 hover:bg-amber-500/15 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw size={14} /> Restart
            </button>
            <button
              onClick={() => onCommand('sleep')}
              disabled={selectedCount === 0 || sending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-400 hover:bg-cyan-500/15 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Moon size={14} /> Sleep
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
