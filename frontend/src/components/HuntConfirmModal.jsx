import React from 'react'
import { CheckCircle, SkipForward, Square, AlertTriangle } from 'lucide-react'

export default function HuntConfirmModal({ data, screenshot, huntId, onConfirm, onSkip, onStop }) {
  const { job_title, company, summary, fields_filled = [], concerns = [] } = data

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(18,6,48,0.88)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-primary-700/50" style={{ background: '#1a1230' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #3b0764, #1e0a4a)' }}>
          <div>
            <h2 className="font-bold text-white text-lg">Ready to Submit</h2>
            <p className="text-sm text-primary-300">{job_title} at {company}</p>
          </div>
          <div className="w-10 h-10 bg-gold-500/20 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-gold-400" />
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {screenshot && (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <img src={`data:image/png;base64,${screenshot}`} alt="Application state" className="w-full object-contain max-h-48" />
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-1.5">Summary</h3>
            <p className="text-sm text-primary-100 leading-relaxed">{summary}</p>
          </div>

          {fields_filled.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-2">Fields Filled</h3>
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
            <div className="rounded-xl p-4 border border-gold-600/40" style={{ background: 'rgba(245,158,11,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gold-400" />
                <h3 className="text-xs font-semibold text-gold-300 uppercase tracking-wide">Heads Up</h3>
              </div>
              <ul className="space-y-1">{concerns.map((c, i) => <li key={i} className="text-sm text-gold-200">• {c}</li>)}</ul>
            </div>
          )}
        </div>

        {/* Three actions */}
        <div className="px-6 py-4 border-t border-white/10 grid grid-cols-3 gap-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button onClick={onStop} className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-2.5 px-3 rounded-xl font-semibold text-sm transition-colors">
            <Square className="w-3.5 h-3.5" /> Stop Hunt
          </button>
          <button onClick={onSkip} className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-primary-200 py-2.5 px-3 rounded-xl font-semibold text-sm border border-white/15 transition-colors">
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
