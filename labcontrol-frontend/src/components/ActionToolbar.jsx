/**
 * ActionToolbar.jsx — Responsive Command buttons, selection controls, WOL, Schedules, Remote Apps, and Deploy Files trigger
 */

import { Power, RotateCcw, Moon, PlusCircle, Activity, Zap, HelpCircle, Clock, Rocket, Package } from 'lucide-react'

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
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap bg-card/40 p-2 md:p-0 rounded-xl">
      {/* ── Selection & Command Buttons Group ──────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onSelectAll} className="btn-secondary min-h-[44px] px-3 text-xs md:text-sm">
            Select All
          </button>
          <button onClick={onDeselectAll} className="btn-secondary min-h-[44px] px-3 text-xs md:text-sm">
            Deselect
          </button>
        </div>

        <div className="hidden md:block w-px h-8 bg-card shrink-0" />

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onPingStatus}
            disabled={sending}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-online/10 border-online/30 text-online hover:bg-online/20 hover:border-online disabled:opacity-40"
            title="Ping and check online/offline status"
          >
            <Activity size={15} /> Check Status
          </button>

          {/* Wake-on-LAN button */}
          <button
            onClick={onWake}
            disabled={selectedCount === 0 || sending}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-400 disabled:opacity-40"
            title="Send Wake-on-LAN Magic Packet (UDP Broadcast)"
          >
            <Zap size={15} /> Wake Selected
          </button>

          {/* Deploy Files Modal Button */}
          <button
            onClick={onOpenDeploy}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25 hover:border-amber-400"
            title="Deploy files or folders to lab PCs"
          >
            <Package size={15} /> Deploy Files
          </button>

          {/* Remote Apps Modal Button */}
          <button
            onClick={onOpenApps}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25 hover:border-purple-400"
            title="Launch or close applications remotely"
          >
            <Rocket size={15} /> Remote Apps
          </button>

          {/* Schedules Modal Button */}
          <button
            onClick={onOpenSchedules}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 hover:border-indigo-400"
            title="Manage automated shutdown/restart/sleep schedules"
          >
            <Clock size={15} /> Schedules
          </button>

          <button
            onClick={() => onCommand('shutdown')}
            disabled={selectedCount === 0 || sending}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-offline/10 border-offline/30 text-offline hover:bg-offline/20 hover:border-offline disabled:opacity-40"
          >
            <Power size={15} /> Shutdown
          </button>

          <button
            onClick={() => onCommand('restart')}
            disabled={selectedCount === 0 || sending}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-warning/10 border-warning/30 text-warning hover:bg-warning/20 hover:border-warning disabled:opacity-40"
          >
            <RotateCcw size={15} /> Restart
          </button>

          <button
            onClick={() => onCommand('sleep')}
            disabled={selectedCount === 0 || sending}
            className="btn-action min-h-[44px] px-3 text-xs md:text-sm bg-info/10 border-info/30 text-info hover:bg-info/20 hover:border-info disabled:opacity-40"
          >
            <Moon size={15} /> Sleep
          </button>

          {/* WOL Guide Help button */}
          <button
            onClick={onOpenWOLHelp}
            className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-elevated transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Wake-on-LAN Setup Guide"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {/* ── Selection Info + Add PC Button ────────────────────────── */}
      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-card">
        {selectedCount > 0 && (
          <span className="text-xs md:text-sm text-slate-400 font-medium">
            {selectedCount} PC{selectedCount !== 1 ? 's' : ''} selected
          </span>
        )}

        <button onClick={onAddPC} className="btn-primary min-h-[44px] px-4 text-xs md:text-sm shadow-md ml-auto">
          <PlusCircle size={16} /> Add PC
        </button>
      </div>
    </div>
  )
}
