/**
 * DeployFilesModal.jsx — Modal for Deploying Files or Folders to Target PCs
 *
 * Supports single/multiple files or entire folder directories (webkitdirectory),
 * target location selection (Desktop, Downloads, Documents, Custom), and live per-PC deployment status.
 */

import { useState, useRef } from 'react'
import { X, Upload, FolderUp, File, Folder, CheckCircle2, AlertCircle, Laptop, HardDrive, Package, ArrowRight } from 'lucide-react'

export default function DeployFilesModal({
  isOpen,
  onClose,
  selectedCount,
  selectedIds,
  pcs = [],
  apiBase,
  onActionComplete
}) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [destDir, setDestDir] = useState('Desktop') // 'Desktop', 'Downloads', 'Documents', 'custom'
  const [customDestDir, setCustomDestDir] = useState('')
  const [targetScope, setTargetScope] = useState(selectedCount > 0 ? 'selected' : 'all')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  if (!isOpen) return null

  const targetPcIds = targetScope === 'selected' && selectedCount > 0
    ? Array.from(selectedIds)
    : 'all'

  const targetCountDisplay = targetScope === 'selected' && selectedCount > 0
    ? `${selectedCount} Selected PC(s)`
    : `All ${pcs.length} PC(s)`

  const totalBytes = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0)
  const formattedSize = totalBytes > 1024 * 1024
    ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(totalBytes / 1024).toFixed(1)} KB`

  function handleFileChange(e) {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files))
      setError('')
      setResults(null)
    }
  }

  async function handleDeploy() {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file or folder to deploy')
      return
    }

    const finalDestDir = destDir === 'custom' ? customDestDir.trim() : destDir
    if (!finalDestDir) {
      setError('Please specify a valid destination folder')
      return
    }

    setError('')
    setLoading(true)
    setResults(null)

    try {
      const formData = new FormData()
      formData.append('pc_ids', JSON.stringify(targetPcIds))
      formData.append('dest_dir', finalDestDir)

      selectedFiles.forEach(file => {
        // preserve webkitRelativePath for directory structures if present
        const filename = file.webkitRelativePath || file.name
        formData.append('files', file, filename)
      })

      const res = await fetch(`${apiBase}/api/deploy-file`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await res.json()
      if (res.ok) {
        setResults(data.results || [])
        if (onActionComplete) onActionComplete()
      } else {
        setError(data.error || 'Failed to deploy files')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-surface border border-elevated rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-card flex items-center justify-between bg-card/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Package size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Deploy Files & Folders</h3>
              <p className="text-xs text-slate-400">Push files or entire directory folders to target lab PCs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-offline/10 border border-offline/20 text-offline text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Target Scope Selection */}
          <div className="p-3 bg-card border border-elevated rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Laptop size={16} className="text-brand" />
              Target PCs: <span className="text-white font-mono">{targetCountDisplay}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-lg border border-elevated">
              <button
                type="button"
                onClick={() => setTargetScope('selected')}
                disabled={selectedCount === 0}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  targetScope === 'selected' && selectedCount > 0
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-30'
                }`}
              >
                Selected ({selectedCount})
              </button>
              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  targetScope === 'all'
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All PCs ({pcs.length})
              </button>
            </div>
          </div>

          {/* File / Folder Select Box */}
          <div className="p-5 border-2 border-dashed border-elevated hover:border-brand/50 rounded-2xl bg-card/30 text-center space-y-3 transition-colors">
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-brand/15 border border-brand/30 text-brand font-semibold text-xs flex items-center gap-2 hover:bg-brand/25 transition-colors cursor-pointer"
              >
                <File size={16} /> Select Files
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold text-xs flex items-center gap-2 hover:bg-amber-500/25 transition-colors cursor-pointer"
              >
                <FolderUp size={16} /> Select Folder
              </button>
            </div>

            {/* Hidden Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <p className="text-[11px] text-slate-500">
              Or drag & drop files here. Supports single files, multiple files, or entire folders.
            </p>
          </div>

          {/* Selected Files Summary List */}
          {selectedFiles.length > 0 && (
            <div className="p-3 bg-card border border-elevated rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Selected Payload:</span>
                <span className="font-mono text-brand">{selectedFiles.length} item(s) ({formattedSize})</span>
              </div>

              <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono text-slate-400">
                {selectedFiles.slice(0, 10).map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 truncate">
                    <File size={12} className="text-slate-500 shrink-0" />
                    <span className="truncate">{file.webkitRelativePath || file.name}</span>
                  </div>
                ))}
                {selectedFiles.length > 10 && (
                  <div className="text-[10px] text-slate-500 italic">
                    ...and {selectedFiles.length - 10} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Target Destination Directory Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <HardDrive size={14} className="text-brand" /> Target PC Folder Location
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Desktop', 'Downloads', 'Documents', 'custom'].map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setDestDir(loc)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors text-center ${
                    destDir === loc
                      ? 'bg-brand text-white border-brand'
                      : 'bg-card border-elevated text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {loc === 'custom' ? 'Custom Path' : loc}
                </button>
              ))}
            </div>

            {destDir === 'custom' && (
              <input
                type="text"
                value={customDestDir}
                onChange={e => setCustomDestDir(e.target.value)}
                placeholder="e.g. C:\LabControl\Assignments"
                className="input-field w-full text-xs font-mono mt-2"
              />
            )}
          </div>

          {/* Execution Results Feed */}
          {results && results.length > 0 && (
            <div className="mt-4 p-3 bg-card border border-elevated rounded-xl space-y-2 animate-in">
              <span className="text-xs font-bold text-slate-300">Deployment Results:</span>
              <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-xs">
                {results.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-card/40 last:border-0">
                    <span className="text-slate-300">{r.name} ({r.ip}):</span>
                    <span className={r.status === 'success' ? 'text-emerald-400 font-semibold' : 'text-offline font-semibold'}>
                      {r.message || r.detail || r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-card bg-card/30 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Port 5556 TCP Chunked Stream
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-xs px-4">
              Close
            </button>
            <button
              onClick={handleDeploy}
              disabled={loading || selectedFiles.length === 0}
              className="btn-primary text-xs px-5 flex items-center gap-1.5 shadow-md disabled:opacity-40"
            >
              {loading ? (
                <>Deploying...</>
              ) : (
                <>
                  <Upload size={14} /> Deploy to PCs <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
