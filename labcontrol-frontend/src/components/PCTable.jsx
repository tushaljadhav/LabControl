/**
 * PCTable.jsx — Sleek, compact table of lab PCs with checkboxes, MAC addresses, status badges, and action buttons (Stats Modal / Edit / Delete)
 * Responsive with horizontal scroll and touch-friendly targets.
 */

import { Edit2, Trash2, Activity } from 'lucide-react'

export default function PCTable({
  pcs,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  allSelected,
  showLabColumn,
  onEditPC,
  onDeletePC,
  onOpenStats
}) {
  if (pcs.length === 0) {
    return (
      <div className="bg-card border border-card rounded-xl p-8 md:p-12 text-center text-slate-400">
        <p className="text-base md:text-lg font-semibold">No PCs found</p>
        <p className="text-xs md:text-sm mt-1">Add a PC using the button above, or select a different lab.</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-card rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[650px]">
          <thead>
            <tr className="bg-elevated">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="table-header">Name</th>
              <th className="table-header">IP Address</th>
              <th className="table-header">MAC Address</th>
              {showLabColumn && <th className="table-header">Lab</th>}
              <th className="table-header">Status</th>
              <th className="table-header">Last Seen</th>
              <th className="table-header text-right px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pcs.map(pc => (
              <tr
                key={pc.id}
                className="border-t border-card/60 hover:bg-hover/50 transition-colors group"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(pc.id)}
                    onChange={() => onToggleSelect(pc.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-sm">{pc.name}</td>
                <td className="px-4 py-3 font-mono text-xs md:text-sm text-slate-400">{pc.ip}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {pc.mac_address || <span className="text-slate-600 italic">Not Set</span>}
                </td>
                {showLabColumn && (
                  <td className="px-4 py-3 text-xs md:text-sm text-slate-400">{pc.lab_name || 'Unassigned'}</td>
                )}
                <td className="px-4 py-3">
                  <StatusBadge status={pc.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {pc.last_seen || <span className="text-slate-600 italic">Never</span>}
                </td>
                <td className="px-4 py-3 text-right px-6">
                  <div className="flex items-center justify-end gap-1">
                    {/* View Live Stats Modal Button */}
                    <button
                      onClick={() => onOpenStats(pc)}
                      className="p-1.5 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors text-sub cursor-pointer"
                      title="View Live CPU / RAM / Disk Stats"
                    >
                      <Activity size={15} />
                    </button>

                    {/* Edit PC Button */}
                    <button
                      onClick={() => onEditPC(pc)}
                      className="p-1.5 hover:text-brand hover:bg-elevated rounded-lg transition-colors text-sub cursor-pointer"
                      title="Edit PC"
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Delete PC Button */}
                    <button
                      onClick={() => onDeletePC(pc)}
                      className="p-1.5 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors text-sub cursor-pointer"
                      title="Delete PC"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * StatusBadge — Small pill with a colored dot and status text.
 */
function StatusBadge({ status }) {
  const styles = {
    online:       { dot: 'bg-online animate-pulse-dot',  pill: 'bg-online/10 text-online',   label: 'Online' },
    success:      { dot: 'bg-online animate-pulse-dot',  pill: 'bg-online/10 text-online',   label: 'Online' },
    offline:      { dot: 'bg-offline',                    pill: 'bg-offline/10 text-offline',  label: 'Offline' },
    error:        { dot: 'bg-warning',                    pill: 'bg-warning/10 text-warning',  label: 'Error' },
    unauthorized: { dot: 'bg-warning',                    pill: 'bg-warning/10 text-warning',  label: 'Unauth' },
    unknown:      { dot: 'bg-muted',                      pill: 'bg-muted/10 text-slate-400',  label: 'Unknown' },
  }

  const s = styles[status] || styles.unknown

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span>{s.label}</span>
    </span>
  )
}
