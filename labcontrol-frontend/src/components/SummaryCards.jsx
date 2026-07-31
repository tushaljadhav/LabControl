/**
 * SummaryCards.jsx — Responsive stats overview cards
 */

import { Monitor, CheckCircle, XCircle } from 'lucide-react'

export default function SummaryCards({ pcs }) {
  const total = pcs.length
  const online = pcs.filter(p => p.status === 'online').length
  const offline = pcs.filter(p => p.status === 'offline').length

  const cards = [
    { label: 'Total PCs',  value: total,   icon: Monitor,     bg: 'bg-brand/10',   text: 'text-brand' },
    { label: 'Online',     value: online,  icon: CheckCircle,  bg: 'bg-online/10',  text: 'text-online' },
    { label: 'Offline',    value: offline, icon: XCircle,      bg: 'bg-offline/10', text: 'text-offline' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-card border border-card rounded-xl p-4 md:p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
        >
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
            <card.icon size={22} className={card.text} />
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold">{card.value}</p>
            <p className="text-xs md:text-sm text-sub font-medium">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
