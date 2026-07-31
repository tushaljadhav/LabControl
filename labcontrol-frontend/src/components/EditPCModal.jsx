/**
 * EditPCModal.jsx — Modal form for editing an existing PC (Name, IP, MAC Address, Lab)
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function EditPCModal({ isOpen, onClose, pc, labs, onPCSaved, apiBase }) {
  const [name, setName] = useState('')
  const [ip, setIp] = useState('')
  const [macAddress, setMacAddress] = useState('')
  const [labId, setLabId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Populate form fields when pc prop changes
  useEffect(() => {
    if (pc) {
      setName(pc.name || '')
      setIp(pc.ip || '')
      setMacAddress(pc.mac_address || '')
      setLabId(pc.lab_id ? String(pc.lab_id) : '')
    }
  }, [pc])

  if (!isOpen || !pc) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !ip.trim()) {
      setError('Name and IP address are required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/pcs/${pc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          ip: ip.trim(),
          mac_address: macAddress.trim() || null,
          lab_id: labId ? parseInt(labId) : null
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update PC')
        return
      }

      onClose()
      onPCSaved()
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
          <h3 className="text-lg font-semibold">Edit PC Details</h3>
          <button onClick={onClose} className="text-muted hover:text-brand transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-sub mb-1">PC Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Lab-PC-01"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sub mb-1">IP Address *</label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 192.168.1.10"
              className="input-field font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sub mb-1">MAC Address (optional for WOL)</label>
            <input
              type="text"
              value={macAddress}
              onChange={e => setMacAddress(e.target.value)}
              placeholder="e.g. 00:11:22:33:44:55"
              className="input-field font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sub mb-1">Assign to Lab</label>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
