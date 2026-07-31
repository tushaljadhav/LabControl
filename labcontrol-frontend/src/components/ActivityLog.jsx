/**
 * ActivityLog.jsx — Recent command log table (Filtered to Last 24 Hours)
 * Includes "Clear All Logs" button and high-contrast text styling for Dark & Light modes.
 */

import { RefreshCw, ClipboardList, Clock, Trash2 } from 'lucide-react'

export default function ActivityLog({ logs, onRefresh, onClearLogs }) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <ClipboardList size={18} className="text-brand" />
          <h2 className="text-base font-bold text-main">Recent Activity</h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
            <Clock size={11} /> Last 24 Hours
          </span>
        </div>

        <div className="flex items-center gap-2">
          {logs && logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="btn-action bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              title="Delete all activity logs"
            >
              <Trash2 size={13} /> Delete All
            </button>
          )}

          <button onClick={onRefresh} className="btn-secondary text-xs px-3 py-1.5 rounded-lg cursor-pointer">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Log table */}
      <div className="bg-card border border-card rounded-xl overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-sub text-sm font-medium">
            No activity logged in the last 24 hours.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={log.id || i} className="border-t border-card/60 hover:bg-hover/40 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-main">{log.pc_name}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs bg-elevated px-2 py-0.5 rounded font-semibold text-brand">
                        {log.command}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <LogStatus status={log.status} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-sub">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    <span className={`text-xs font-bold uppercase ${colors[status] || 'text-sub'}`}>
      {status}
    </span>
  )
}
