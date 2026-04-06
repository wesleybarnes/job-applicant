import React, { useState, useEffect } from 'react'
import { Zap, X, Loader2, Sparkles } from 'lucide-react'
import { listPacks, createCheckout } from '../api/client'

export default function CreditsModal({ onClose }) {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)

  useEffect(() => { listPacks().then(setPacks).catch(() => setPacks([])).finally(() => setLoading(false)) }, [])

  const handleBuy = async (packId) => {
    setBuying(packId)
    try { const { checkout_url } = await createCheckout(packId); window.location.href = checkout_url }
    catch (e) { alert(e.response?.data?.detail || 'Payments not set up.') }
    finally { setBuying(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="card w-full max-w-md overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center border border-brand-500/20">
              <Zap className="w-4 h-4 text-brand-400" />
            </div>
            <h2 className="font-bold text-ink-primary text-lg">Get Credits</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-tertiary hover:text-ink-primary rounded-xl hover:bg-surface-hover transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-ink-secondary mb-1">Each hunt costs <strong className="text-ink-primary">5 credits</strong>.</p>
          <p className="text-xs text-ink-tertiary mb-5">Credits never expire.</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-400" /></div>
          ) : packs.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-ink-tertiary opacity-20" />
              <p className="text-sm text-ink-secondary">Payments not configured.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {packs.map(pack => {
                const isPopular = pack.id === 'standard'
                return (
                  <div key={pack.id} className={`rounded-xl border p-4 transition-all ${isPopular ? 'border-brand-500/30 bg-brand-500/5' : 'border-surface-border hover:border-brand-500/20'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-ink-primary">{pack.label}</span>
                          {isPopular && <span className="badge bg-brand-500/15 text-brand-400 text-xs border border-brand-500/20">Popular</span>}
                        </div>
                        <p className="text-xs text-ink-tertiary">${(pack.price_cents / 100).toFixed(0)} · ${((pack.price_cents / 100) / pack.credits).toFixed(2)}/credit</p>
                      </div>
                      <button onClick={() => handleBuy(pack.id)} disabled={!!buying} className="btn-primary text-sm py-2 px-4 disabled:opacity-40">
                        {buying === pack.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `$${(pack.price_cents / 100).toFixed(0)}`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
