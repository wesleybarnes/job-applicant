import React from 'react'
import { CheckCircle, SkipForward, Square, AlertTriangle } from 'lucide-react'

export default function HuntConfirmModal({ data, screenshot, huntId, onConfirm, onSkip, onStop }) {
  const { job_title, company, summary, fields_filled = [], concerns = [] } = data

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-700/50" style={{ background: '#18181B' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-700/50 flex items-center justify-between"
          style={{ background: '#1F1F23' }}>
          <div>
            <h2 className="font-bold text-white text-lg">Ready to Submit</h2>
            <p className="text-sm text-zinc-400">{job_title} at {company}</p>
          </div>
          <div className="w-10 h-10 bg-brand-500/15 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-brand-400" />
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {screenshot && (
            <div className="rounded-2xl overflow-hidden border border-zinc-700/50 bg-black">
              <img src={`data:image/png;base64,${screenshot}`} alt="Application state" className="w-full object-contain max-h-48" />
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Summary</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>
          </div>

          {fields_filled.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Fields Filled</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {fields_filled.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /><span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {concerns.length > 0 && (
            <div className="rounded-2xl p-4 border border-amber-600/30" style={{ background: 'rgba(245,158,11,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Heads Up</h3>
              </div>
              <ul className="space-y-1">{concerns.map((c, i) => <li key={i} className="text-sm text-amber-200">• {c}</li>)}</ul>
            </div>
          )}
        </div>

        {/* Three actions */}
        <div className="px-6 py-4 border-t border-zinc-700/50 grid grid-cols-3 gap-3" style={{ background: '#111114' }}>
          <button onClick={onStop} className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors">
            <Square className="w-3.5 h-3.5" /> Stop Hunt
          </button>
          <button onClick={onSkip} className="flex items-center justify-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 py-2.5 px-3 rounded-xl font-semibold text-sm border border-zinc-600 transition-colors">
            <SkipForward className="w-3.5 h-3.5" /> Skip Job
          </button>
          <button onClick={onConfirm} className="btn-gold flex items-center justify-center gap-1.5 text-sm py-2.5 px-3">
            <CheckCircle className="w-3.5 h-3.5" /> Submit
          </button>
        </div>
      </div>
    </div>
  )
}
