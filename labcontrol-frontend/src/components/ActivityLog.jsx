/**
 * ActivityLog.jsx — Recent command log table
 *
 * Shows the last 20 commands sent to PCs: who received it,
 * what command, the result, and when it happened.
 *
 * The log auto-refreshes via the parent (LabDashboard),
 * but also has a manual "Refresh" button.
 */

import { RefreshCw, ClipboardList } from 'lucide-react'

export default function ActivityLog({ logs, onRefresh }) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ClipboardList size={18} className="text-slate-400" />
          Recent Activity
        </h2>
        <button onClick={onRefresh} className="btn-secondary text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Log table */}
      <div className="bg-card border border-card rounded-xl overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No activity yet. Send a command to see logs here.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-elevated">
                <th className="table-header">PC Name</th>
                <th className="table-header">Command</th>
                <th className="table-header">Status</th>
                <th className="table-header">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id || i} className="border-t border-card/60">
                  <td className="px-4 py-2.5 text-sm font-medium">{log.pc_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-elevated px-2 py-0.5 rounded">
                      {log.command}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <LogStatus status={log.status} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/** Colored text for log status */
function LogStatus({ status }) {
  const colors = {
    success: 'text-online',
    offline: 'text-offline',
    error:   'text-warning',
  }
  return (
    <span className={`text-xs font-semibold uppercase ${colors[status] || 'text-slate-400'}`}>
      {status}
    </span>
  )
}
