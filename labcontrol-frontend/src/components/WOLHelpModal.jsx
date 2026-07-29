/**
 * WOLHelpModal.jsx — Setup Guide for Wake-on-LAN (WOL)
 */

import { X, Zap, Cpu, Network, CheckCircle2 } from 'lucide-react'

export default function WOLHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-elevated rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in space-y-5" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-card pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Wake-on-LAN (WOL) Guide</h3>
              <p className="text-xs text-slate-400">How to wake powered-off PCs remotely</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Requirements summary alert */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-300 space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 size={16} /> Key Requirement
          </p>
          <p className="text-xs text-emerald-200/80 leading-relaxed">
            To use Wake-on-LAN, WOL must be enabled in each target PC's BIOS/UEFI settings and Windows Network Adapter properties, and the correct MAC address must be saved for that PC in LabControl.
          </p>
        </div>

        {/* Setup steps */}
        <div className="space-y-4 text-sm">
          {/* Step 1: BIOS/UEFI */}
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-surface border border-card text-brand shrink-0 h-fit">
              <Cpu size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">1. Enable WOL in BIOS/UEFI</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Restart target PC ➔ Enter BIOS (F2 / Del) ➔ Navigate to Power Management ➔ Enable <strong>"Wake on LAN"</strong> or <strong>"Power On By PCIe"</strong>.
              </p>
            </div>
          </div>

          {/* Step 2: Windows Network Adapter */}
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-surface border border-card text-brand shrink-0 h-fit">
              <Network size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">2. Enable in Windows Network Adapter</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Open Device Manager ➔ Network Adapters ➔ Right-click Ethernet card ➔ Properties ➔ Advanced tab ➔ Enable <strong>"Wake on Magic Packet"</strong>. Under Power Management tab, check <strong>"Allow this device to wake the computer"</strong>.
              </p>
            </div>
          </div>

          {/* Step 3: Save MAC Address in LabControl */}
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-surface border border-card text-emerald-400 shrink-0 h-fit">
              <Zap size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">3. Save MAC Address in LabControl</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit the PC in LabControl and enter its MAC address (e.g. <code className="text-slate-300 font-mono">AA:BB:CC:DD:EE:FF</code>). Then click <strong>"Wake Selected"</strong> to power it on!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-card">
          <button onClick={onClose} className="btn-primary">Got it!</button>
        </div>
      </div>
    </div>
  )
}
