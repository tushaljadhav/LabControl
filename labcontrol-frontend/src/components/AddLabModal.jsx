/**
 * AddLabModal.jsx — Modal form for creating a new lab
 *
 * Opens as an overlay when the user clicks "+ New Lab" in the sidebar.
 * Has two fields: Lab Name (required) and Location (optional).
 * On submit, calls POST /api/labs and refreshes the lab list.
 */

import { useState } from 'react'
import { X } from 'lucide-react'

export default function AddLabModal({ isOpen, onClose, onLabAdded, apiBase }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Don't render anything if the modal is closed
  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault() // Prevent page reload on form submit
    setError('')

    if (!name.trim()) {
      setError('Lab name is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), location: location.trim() || null })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create lab')
        return
      }

      // Success — reset form, close modal, refresh lab list
      setName('')
      setLocation('')
      onClose()
      onLabAdded()
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
          <h3 className="text-lg font-semibold">Create New Lab</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Lab Name *</label>
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Location (optional)</label>
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
              {loading ? 'Creating...' : 'Create Lab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
