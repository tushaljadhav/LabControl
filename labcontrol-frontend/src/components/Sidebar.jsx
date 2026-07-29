/**
 * Sidebar.jsx — Lab navigation sidebar with Edit/Delete options, User Logout, 2FA Security Modal trigger, Email Alert trigger, Theme Toggle, and Mobile Drawer support
 */

import { useState } from 'react'
import { Layers, Plus, Building2, Zap, Edit2, Trash2, LogOut, User as UserIcon, ShieldCheck, Sun, Moon, X, Bell } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import AddLabModal from './AddLabModal'
import EditLabModal from './EditLabModal'

export default function Sidebar({
  labs,
  selectedLabId,
  onSelectLab,
  onLabsChanged,
  onOpenSecurity,
  onOpenAlerts,
  apiBase,
  isOpenMobile,
  onCloseMobile
}) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showAddLab, setShowAddLab] = useState(false)
  const [editingLab, setEditingLab] = useState(null)

  // Calculate total PC count across all labs
  const totalPCs = (labs || []).reduce((sum, lab) => sum + (lab.pc_count || 0), 0)

  async function handleDeleteLab(lab, e) {
    e.stopPropagation()

    if (lab.pc_count > 0) {
      alert(`Cannot delete "${lab.name}" because it has ${lab.pc_count} assigned PC(s). Please move or delete the PCs first.`)
      return
    }

    if (!window.confirm(`Are you sure you want to delete lab "${lab.name}"?`)) return

    try {
      const res = await fetch(`${apiBase}/api/labs/${lab.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Failed to delete lab')
        return
      }

      if (selectedLabId === lab.id) {
        onSelectLab(null)
      }
      onLabsChanged()
    } catch (err) {
      alert('Network error: ' + err.message)
    }
  }

  function handleEditLab(lab, e) {
    e.stopPropagation()
    setEditingLab(lab)
  }

  function handleSelectLabMobile(labId) {
    onSelectLab(labId)
    if (onCloseMobile) onCloseMobile()
  }

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden animate-in"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`w-64 bg-surface border-r border-card flex flex-col shrink-0 h-screen fixed md:relative z-40 top-0 left-0 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* ── Logo / Brand + Theme Toggle + Mobile Close ───────────── */}
        <div className="p-4 md:p-5 border-b border-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand to-indigo-400 flex items-center justify-center shadow-md">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">LabControl</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-elevated hover:bg-hover text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun size={17} className="text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon size={17} className="text-indigo-400 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Mobile Drawer Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-lg bg-elevated hover:bg-hover text-slate-400 hover:text-white transition-colors md:hidden"
              title="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Lab list ──────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* "All Labs" option */}
          <button
            onClick={() => handleSelectLabMobile(null)}
            className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer min-h-[44px]
              ${selectedLabId === null
                ? 'bg-brand/15 text-brand'
                : 'text-slate-400 hover:bg-hover hover:text-slate-200'
              }`}
          >
            <Layers size={16} />
            <span className="flex-1 text-left">All Labs</span>
            <span className="text-xs bg-elevated px-2 py-0.5 rounded-full">{totalPCs}</span>
          </button>

          {/* Individual labs */}
          {(labs || []).map(lab => (
            <div
              key={lab.id}
              onClick={() => handleSelectLabMobile(lab.id)}
              className={`w-full flex items-center gap-2 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer group min-h-[44px]
                ${selectedLabId === lab.id
                  ? 'bg-brand/15 text-brand'
                  : 'text-slate-400 hover:bg-hover hover:text-slate-200'
                }`}
            >
              <Building2 size={16} className="shrink-0" />
              <span className="flex-1 text-left truncate">{lab.name}</span>

              <span className="text-xs bg-elevated px-2 py-0.5 rounded-full shrink-0 group-hover:hidden">
                {lab.pc_count || 0}
              </span>

              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  onClick={e => handleEditLab(lab, e)}
                  className="p-1 hover:text-white hover:bg-elevated rounded transition-colors"
                  title="Edit Lab"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={e => handleDeleteLab(lab, e)}
                  className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Delete Lab"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </nav>

        {/* ── Add Lab button + Logged-in User Bar ───────────────────── */}
        <div className="p-3 border-t border-card space-y-2">
          <button
            onClick={() => setShowAddLab(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 md:py-2 rounded-lg text-sm font-medium text-slate-400 border border-dashed border-slate-600 hover:border-brand hover:text-brand transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            New Lab
          </button>

          {user && (
            <div className="flex items-center justify-between pt-1 px-1 text-xs text-slate-400">
              <div className="flex items-center gap-2 truncate">
                <div className="p-1.5 rounded-full bg-elevated text-slate-300">
                  <UserIcon size={14} />
                </div>
                <span className="font-semibold text-slate-200 truncate">{user.username}</span>
                {user.two_factor_enabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">2FA</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* 2FA Security Settings Button */}
                <button
                  onClick={onOpenSecurity}
                  className="p-2 rounded-lg hover:bg-elevated hover:text-brand transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Security & 2FA Settings"
                >
                  <ShieldCheck size={16} />
                </button>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-offline/10 hover:text-offline transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Log Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Modal for adding a new lab */}
      <AddLabModal
        isOpen={showAddLab}
        onClose={() => setShowAddLab(false)}
        onLabAdded={onLabsChanged}
        apiBase={apiBase}
      />

      {/* Modal for editing a lab */}
      <EditLabModal
        isOpen={!!editingLab}
        onClose={() => setEditingLab(null)}
        lab={editingLab}
        onLabSaved={onLabsChanged}
        apiBase={apiBase}
      />
    </>
  )
}
