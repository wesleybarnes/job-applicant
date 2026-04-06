import React from 'react'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ data, screenshot, onConfirm, onCancel }) {
  const { summary, fields_filled = [], concerns = [] } = data

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
      <div className="rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/10" style={{ background: 'linear-gradient(180deg, #1a1625, #12101c)' }}>

        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3" style={{ background: 'rgba(139,92,246,0.08)' }}>
          <div className="w-9 h-9 bg-brand-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">Ready to Submit</h2>
            <p className="text-sm text-zinc-400">Review before the AI clicks submit</p>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {screenshot && <div className="rounded-2xl overflow-hidden border border-white/10 bg-black"><img src={`data:image/png;base64,${screenshot}`} alt="Application state" className="w-full object-contain max-h-52" /></div>}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Summary</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>
          </div>
          {fields_filled.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Fields Filled</h3>
              <div className="grid grid-cols-2 gap-1.5">{fields_filled.map((f, i) => <div key={i} className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /><span>{f}</span></div>)}</div>
            </div>
          )}
          {concerns.length > 0 && (
            <div className="rounded-2xl p-4 border border-amber-600/20" style={{ background: 'rgba(245,158,11,0.05)' }}>
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Heads Up</h3></div>
              <ul className="space-y-1">{concerns.map((c, i) => <li key={i} className="text-sm text-amber-200">• {c}</li>)}</ul>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <button onClick={onCancel} className="btn-danger flex items-center gap-2"><XCircle className="w-4 h-4" /> Don't Submit</button>
          <button onClick={onConfirm} className="btn-gold flex items-center gap-2 text-sm py-2.5 px-5"><CheckCircle className="w-4 h-4" /> Yes, Submit Application</button>
        </div>
      </div>
    </div>
  )
}
