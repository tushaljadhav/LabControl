/**
 * SchedulesModal.jsx — Automated Timers & Scheduled Actions Modal
 *
 * Allows admins to view, add, toggle active status, and delete automated schedules (shutdown/restart/sleep at set times on specific days).
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Clock, Calendar, Power, RotateCcw, Moon, Plus, Trash2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Building2 } from 'lucide-react'

const ALL_DAYS = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
]

export default function SchedulesModal({ isOpen, onClose, labs, apiBase }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form State
  const [selectedLabId, setSelectedLabId] = useState('')
  const [command, setCommand] = useState('shutdown')
  const [time, setTime] = useState('18:00')
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/schedules`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSchedules(data)
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    if (isOpen) {
      fetchSchedules()
      setError('')
      setSuccessMsg('')
    }
  }, [isOpen, fetchSchedules])

  if (!isOpen) return null

  function toggleDay(dayKey) {
    if (selectedDays.includes(dayKey)) {
      if (selectedDays.length === 1) return // Keep at least 1 day selected
      setSelectedDays(selectedDays.filter(d => d !== dayKey))
    } else {
      setSelectedDays([...selectedDays, dayKey])
    }
  }

  function selectAllDays() {
    setSelectedDays(ALL_DAYS.map(d => d.key))
  }

  async function handleAddSchedule(e) {
    e.preventDefault()
    if (!time || !command) {
      setError('Please select time and command')
      return
    }

    setError('')
    try {
      const res = await fetch(`${apiBase}/api/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lab_id: selectedLabId ? parseInt(selectedLabId) : null,
          command,
          scheduled_time: time,
          days_of_week: selectedDays.join(',')
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create schedule')
        return
      }

      setSuccessMsg('Automated schedule created!')
      setShowAddForm(false)
      fetchSchedules()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError('Error creating schedule: ' + err.message)
    }
  }

  async function handleToggleSchedule(scheduleId) {
    try {
      const res = await fetch(`${apiBase}/api/schedules/${scheduleId}/toggle`, {
        method: 'POST',
        credentials: 'include'
      })
      if (res.ok) {
        fetchSchedules()
      }
    } catch (err) {
      console.error('Error toggling schedule:', err)
    }
  }

  async function handleDeleteSchedule(scheduleId) {
    if (!window.confirm('Delete this automated schedule?')) return
    try {
      const res = await fetch(`${apiBase}/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        fetchSchedules()
      }
    } catch (err) {
      console.error('Error deleting schedule:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-surface border border-elevated rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-card flex items-center justify-between bg-card/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand/15 text-brand border border-brand/20">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Scheduled Actions & Timers</h3>
              <p className="text-xs text-slate-400">Automate daily shutdown, restart, or sleep times per lab</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-brand hover:bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-offline/10 border border-offline/20 text-offline text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle Add Form Button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Active Schedules ({schedules.length})
            </span>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Plus size={14} />
              {showAddForm ? 'Cancel Form' : 'New Schedule'}
            </button>
          </div>

          {/* Add Schedule Form */}
          {showAddForm && (
            <form onSubmit={handleAddSchedule} className="p-4 bg-card border border-elevated rounded-xl space-y-4 animate-in">
              <h4 className="text-sm font-bold border-b border-elevated pb-2">Create New Schedule</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Target Lab */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Lab</label>
                  <select
                    value={selectedLabId}
                    onChange={e => setSelectedLabId(e.target.value)}
                    className="input-field py-2 text-xs"
                  >
                    <option value="">All Labs (Global)</option>
                    {(labs || []).map(lab => (
                      <option key={lab.id} value={lab.id}>{lab.name}</option>
                    ))}
                  </select>
                </div>

                {/* Command */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Command Action</label>
                  <select
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                    className="input-field py-2 text-xs"
                  >
                    <option value="shutdown">Shutdown</option>
                    <option value="restart">Restart</option>
                    <option value="sleep">Sleep</option>
                  </select>
                </div>

                {/* Time Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Time (HH:MM)</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="input-field py-1.5 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Days Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Repeat Days</label>
                  <button
                    type="button"
                    onClick={selectAllDays}
                    className="text-[11px] text-brand hover:underline"
                  >
                    Select All Days
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {ALL_DAYS.map(day => {
                    const isSelected = selectedDays.includes(day.key)
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleDay(day.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-brand text-white'
                            : 'bg-elevated text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          )}

          {/* Schedules Table / List */}
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-6">Loading schedules...</p>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center bg-card border border-elevated rounded-xl">
              <Calendar size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No Automated Schedules Active</p>
              <p className="text-xs text-slate-500 mt-1">Click "New Schedule" above to set up automated power actions.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {schedules.map(sch => (
                <div
                  key={sch.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    sch.is_active
                      ? 'bg-card border-elevated'
                      : 'bg-card/40 border-card/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => handleToggleSchedule(sch.id)}
                      className="text-slate-400 hover:text-brand transition-colors cursor-pointer"
                      title={sch.is_active ? 'Disable Schedule' : 'Enable Schedule'}
                    >
                      {sch.is_active ? (
                        <ToggleRight size={28} className="text-emerald-400" />
                      ) : (
                        <ToggleLeft size={28} className="text-slate-500" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Command Badge */}
                        <CommandBadge command={sch.command} />

                        {/* Lab Badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-elevated text-slate-300">
                          <Building2 size={12} />
                          {sch.lab_name}
                        </span>

                        {/* Time */}
                        <span className="text-sm font-mono font-bold text-white px-2 py-0.5 rounded bg-brand/20 text-brand">
                          {sch.scheduled_time}
                        </span>
                      </div>

                      {/* Days */}
                      <p className="text-xs text-slate-400 mt-1">
                        Days: <span className="font-semibold text-slate-300">{sch.days_of_week}</span>
                      </p>
                    </div>
                  </div>

                  {/* Delete Action */}
                  <button
                    onClick={() => handleDeleteSchedule(sch.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Schedule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-card bg-card/30 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function CommandBadge({ command }) {
  const styles = {
    shutdown: { bg: 'bg-red-500/15 border-red-500/30 text-red-400', icon: Power, label: 'Shutdown' },
    restart:  { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400', icon: RotateCcw, label: 'Restart' },
    sleep:    { bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400', icon: Moon, label: 'Sleep' },
  }

  const s = styles[command] || styles.shutdown
  const Icon = s.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.bg}`}>
      <Icon size={12} />
      {s.label}
    </span>
  )
}
