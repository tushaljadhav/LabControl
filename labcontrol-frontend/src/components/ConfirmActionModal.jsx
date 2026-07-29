/**
 * ConfirmActionModal.jsx — Confirmation dialog for destructive actions
 *
 * Shows a warning modal before executing shutdown, restart, etc.
 * Lists exactly how many PCs will be affected and uses color-coded
 * styling to match the severity of the action.
 *
 * Props:
 *  action   — { command: 'shutdown', pcCount: 3 } or null (null = closed)
 *  onConfirm — called with the command string when user clicks "Confirm"
 *  onCancel  — called when user clicks "Cancel" or clicks outside
 */

import { AlertTriangle } from 'lucide-react'

export default function ConfirmActionModal({ action, onConfirm, onCancel }) {
  // Don't render if there's no pending action
  if (!action) return null

  const { command, pcCount } = action

  // Customize the text and colors based on the command
  const config = {
    shutdown: {
      title: 'Confirm Shutdown',
      message: `This will SHUT DOWN ${pcCount} PC(s). They will turn off in ~5 seconds.`,
      btnColor: 'bg-offline hover:bg-red-600',
      btnText: 'Shutdown',
    },
    restart: {
      title: 'Confirm Restart',
      message: `This will RESTART ${pcCount} PC(s). They will reboot in ~5 seconds.`,
      btnColor: 'bg-warning hover:bg-amber-600',
      btnText: 'Restart',
    },
    sleep: {
      title: 'Confirm Sleep',
      message: `This will put ${pcCount} PC(s) to SLEEP.`,
      btnColor: 'bg-info hover:bg-cyan-600',
      btnText: 'Sleep',
    },
    cancel: {
      title: 'Cancel Pending Actions',
      message: `This will cancel any pending shutdown/restart on ${pcCount} PC(s). This is safe.`,
      btnColor: 'bg-muted hover:bg-gray-600',
      btnText: 'Cancel Actions',
    },
  }

  const c = config[command] || config.cancel

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-card border border-elevated rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        {/* Warning icon + title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <h3 className="text-lg font-semibold">{c.title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{c.message}</p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">
            Go Back
          </button>
          <button
            onClick={() => onConfirm(command)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${c.btnColor}`}
          >
            {c.btnText}
          </button>
        </div>
      </div>
    </div>
  )
}
