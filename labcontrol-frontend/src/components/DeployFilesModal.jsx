/**
 * DeployFilesModal.jsx — Remote File & Folder Deployment Modal with Real-Time Progress Tracking
 */

import { useState, useRef, useMemo } from 'react'
import {
  Package,
  X,
  Upload,
  FolderUp,
  File,
  HardDrive,
  Laptop,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react'

export default function DeployFilesModal({
  isOpen,
  onClose,
  selectedCount,
  selectedIds,
  pcs,
  apiBase,
  onActionComplete
}) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [destDir, setDestDir] = useState('Desktop') // 'Desktop', 'Downloads', 'Documents', 'custom'
  const [customDestDir, setCustomDestDir] = useState('')
  const [targetScope, setTargetScope] = useState(selectedCount > 0 ? 'selected' : 'all')

  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // { percent, loadedMB, totalMB, phase }
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const formattedSize = useMemo(() => {
    if (!selectedFiles.length) return '0 KB'
    let sum = 0
    for (let i = 0; i < selectedFiles.length; i++) {
      sum += selectedFiles[i].size || 0
    }
    return sum > 1024 * 1024
      ? `${(sum / (1024 * 1024)).toFixed(1)} MB`
      : `${(sum / 1024).toFixed(1)} KB`
  }, [selectedFiles])

  if (!isOpen) return null

  const targetPcIds = targetScope === 'selected' && selectedCount > 0
    ? Array.from(selectedIds)
    : 'all'

  const targetCountDisplay = targetScope === 'selected' && selectedCount > 0
    ? `${selectedCount} Selected PC(s)`
    : `All ${pcs.length} PC(s)`

  function handleFileChange(e) {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files))
      setError('')
      setResults(null)
      setUploadProgress(null)
    }
  }

  function handleDeploy() {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file or folder to deploy')
      return
    }

    const finalDestDir = destDir === 'custom' ? customDestDir.trim() : destDir
    if (!finalDestDir) {
      setError('Please specify a valid destination folder')
      return
    }

    const totalSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0)
    setError('')
    setLoading(true)
    setResults(null)
    setUploadProgress({ percent: 0, loadedMB: '0.0', totalMB: (totalSize / (1024 * 1024)).toFixed(1), phase: 'Uploading payload to server...' })

    try {
      const formData = new FormData()
      formData.append('pc_ids', JSON.stringify(targetPcIds))
      formData.append('dest_dir', finalDestDir)

      selectedFiles.forEach(file => {
        const filename = file.webkitRelativePath || file.name
        formData.append('files', file, filename)
      })

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${apiBase}/api/deploy-file`, true)
      xhr.withCredentials = true

      // Track real-time upload progress percentage & MBs
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1)
          const totalMB = (event.total / (1024 * 1024)).toFixed(1)
          const phase = percent < 100 ? 'Uploading payload to server...' : 'Transferring payload over LAN to target PCs...'
          setUploadProgress({ percent, loadedMB, totalMB, phase })
        }
      }

      xhr.onload = () => {
        setLoading(false)
        setUploadProgress(null)

        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            setResults(data.results || [])
            if (onActionComplete) onActionComplete()
          } else {
            setError(data.error || `Deployment error (Status ${xhr.status})`)
          }
        } catch (err) {
          if (xhr.status === 413) {
            setError('Payload too large for a single upload request')
          } else {
            setError(`Deployment Error (HTTP ${xhr.status}): ${xhr.statusText || 'Unexpected server response'}`)
          }
        }
      }

      xhr.onerror = () => {
        setLoading(false)
        setUploadProgress(null)
        setError('Network error during deployment transfer')
      }

      xhr.send(formData)
    } catch (err) {
      setLoading(false)
      setUploadProgress(null)
      setError('Error initiating deployment: ' + err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
      <div className="bg-card border border-card rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-card flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Package size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-main">Deploy Files & Folders</h3>
              <p className="text-xs text-sub">Push files or entire directory folders to target lab PCs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-sub hover:text-brand hover:bg-elevated transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4">
          
          {/* Target PCs Selector */}
          <div className="p-3 bg-surface border border-elevated rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-sub">
              <Laptop size={16} className="text-brand" />
              Target PCs: <span className="text-brand font-mono font-bold">{targetCountDisplay}</span>
            </div>

            <div className="flex items-center gap-1 bg-elevated p-1 rounded-lg border border-elevated">
              <button
                type="button"
                onClick={() => setTargetScope('selected')}
                disabled={selectedCount === 0}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  targetScope === 'selected' && selectedCount > 0
                    ? 'bg-brand text-white'
                    : 'text-sub hover:text-main disabled:opacity-30'
                }`}
              >
                Selected ({selectedCount})
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  targetScope === 'all' || selectedCount === 0
                    ? 'bg-brand text-white'
                    : 'text-sub hover:text-main'
                }`}
              >
                All PCs ({pcs.length})
              </button>
            </div>
          </div>

          {/* File / Folder Dropzone area */}
          <div className="border-2 border-dashed border-card hover:border-brand/50 rounded-2xl p-5 md:p-6 text-center space-y-3 bg-surface/30 transition-colors">
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Upload size={24} />
            </div>

            <div>
              <p className="text-sm font-semibold text-main">Choose items to deploy</p>
              <p className="text-xs text-sub mt-0.5">Select individual files or full directory folders</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary py-2 px-3.5 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <File size={15} /> Select File(s)
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="btn-action bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500/25 py-2 px-3.5 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <FolderUp size={15} /> Select Folder
              </button>
            </div>

            {/* Hidden File Inputs */}
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
          </div>

          {/* Selected Payload Summary */}
          {selectedFiles.length > 0 && (
            <div className="p-3.5 bg-surface border border-elevated rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-sub">Selected Payload:</span>
                <span className="font-mono text-brand font-bold">{selectedFiles.length} item(s) ({formattedSize})</span>
              </div>

              <div className="max-h-28 overflow-y-auto space-y-1 text-xs font-mono text-sub">
                {selectedFiles.slice(0, 10).map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 truncate">
                    <File size={13} className="text-brand shrink-0" />
                    <span className="truncate">{file.webkitRelativePath || file.name}</span>
                  </div>
                ))}
                {selectedFiles.length > 10 && (
                  <div className="text-[11px] text-sub italic">
                    ...and {selectedFiles.length - 10} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Destination Directory Option */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-sub flex items-center gap-1.5">
              <HardDrive size={14} className="text-brand" /> Target PC Folder Location
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Desktop', 'Downloads', 'Documents', 'custom'].map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setDestDir(loc)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-colors text-center cursor-pointer ${
                    destDir === loc
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface border-elevated text-sub hover:text-main'
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

          {/* REAL-TIME UPLOAD PROGRESS BAR */}
          {loading && uploadProgress && (
            <div className="p-4 bg-surface border border-brand/30 rounded-xl space-y-2.5 animate-in">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-brand font-bold">
                  <RefreshCw size={14} className="animate-spin text-brand" />
                  {uploadProgress.phase}
                </span>
                <span className="font-mono text-brand font-bold text-sm">
                  {uploadProgress.percent}%
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="h-3 bg-elevated rounded-full overflow-hidden p-0.5 border border-card shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-brand to-indigo-500 rounded-full transition-all duration-300 shadow-md"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-sub">
                <span>Transferred: <strong>{uploadProgress.loadedMB} MB</strong> of <strong>{uploadProgress.totalMB} MB</strong></span>
                <span>Speed: High-Speed LAN</span>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-2 text-red-500 text-xs font-semibold animate-in">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Feed Table */}
          {results && results.length > 0 && (
            <div className="mt-4 p-3 bg-surface border border-elevated rounded-xl space-y-2 animate-in">
              <span className="text-xs font-bold text-main flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand" /> Deployment Results:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
                {results.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-card/40 last:border-0">
                    <span className="text-sub font-semibold">{r.name} ({r.ip}):</span>
                    <span className={r.status === 'success' ? 'text-online font-bold' : 'text-offline font-bold'}>
                      {r.message || r.detail || r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-card bg-surface flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDeploy}
            disabled={loading || selectedFiles.length === 0}
            className="btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Deploying ({uploadProgress?.percent || 0}%)...
              </>
            ) : (
              <>
                <Upload size={14} /> Deploy Payload
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
