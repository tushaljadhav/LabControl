/**
 * AddPCModal.jsx — Modal form for adding a new PC (Name, IP, MAC Address, Lab)
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function AddPCModal({ isOpen, onClose, onPCAdded, labs, defaultLabId, apiBase }) {
  const [name, setName] = useState('')
  const [ip, setIp] = useState('')
  const [macAddress, setMacAddress] = useState('')
  const [labId, setLabId] = useState(defaultLabId || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLabId(defaultLabId || (labs.length > 0 ? labs[0].id : ''))
    }
  }, [isOpen, defaultLabId, labs])

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !ip.trim()) {
      setError('Name and IP address are required')
      return
    }

    setLoading(true)
    try {
      const body = {
        name: name.trim(),
        ip: ip.trim(),
        mac_address: macAddress.trim() || null
      }
      if (labId) body.lab_id = parseInt(labId)

      const res = await fetch(`${apiBase}/api/pcs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add PC')
        return
      }

      setName('')
      setIp('')
      setMacAddress('')
      onClose()
      onPCAdded()
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card border border-elevated rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Add New PC</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">PC Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Lab-PC-04"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">IP Address *</label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 192.168.1.14"
              className="input-field font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">MAC Address (optional for WOL)</label>
            <input
              type="text"
              value={macAddress}
              onChange={e => setMacAddress(e.target.value)}
              placeholder="e.g. 00:11:22:33:44:55"
              className="input-field font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Assign to Lab</label>
            <select
              value={labId}
              onChange={e => setLabId(e.target.value)}
              className="input-field"
            >
              <option value="">-- No Lab --</option>
              {labs.map(lab => (
                <option key={lab.id} value={lab.id}>{lab.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-offline text-sm">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Adding...' : 'Add PC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
