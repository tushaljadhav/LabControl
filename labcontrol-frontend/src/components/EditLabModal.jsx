/**
 * EditLabModal.jsx — Modal form for editing an existing lab
 *
 * Pre-fills fields with current Lab data (Name, Location).
 * Submits changes via PUT /api/labs/<lab_id>.
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function EditLabModal({ isOpen, onClose, lab, onLabSaved, apiBase }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lab) {
      setName(lab.name || '')
      setLocation(lab.location || '')
    }
  }, [lab])

  if (!isOpen || !lab) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Lab name is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/labs/${lab.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || null
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update lab')
        return
      }

      onClose()
      onLabSaved()
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
          <h3 className="text-lg font-semibold">Edit Lab Details</h3>
          <button onClick={onClose} className="text-muted hover:text-brand transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-sub mb-1">Lab Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Computer Lab A"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sub mb-1">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Block B, 2nd Floor"
              className="input-field"
            />
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
