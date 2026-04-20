import React, { useState, useEffect } from 'react'
import { Zap, X, Loader2 } from 'lucide-react'
import { listPacks, createCheckout } from '../api/client'

export default function CreditsModal({ onClose }) {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)

  useEffect(() => { listPacks().then(setPacks).catch(() => setPacks([])).finally(() => setLoading(false)) }, [])
  const handleBuy = async (packId) => { setBuying(packId); try { const { checkout_url } = await createCheckout(packId); window.location.href = checkout_url } catch (e) { alert(e.response?.data?.detail || 'Not configured.') } finally { setBuying(null) } }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-[14px] font-medium text-ink-primary">Credits</span>
          </div>
          <button onClick={onClose} className="text-ink-tertiary hover:text-ink-primary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <p className="text-[12px] text-ink-tertiary mb-5">5 credits per hunt. Never expire.</p>
          {loading ? <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-ink-tertiary" /></div>
          : packs.length === 0 ? <p className="text-[12px] text-ink-tertiary text-center py-6">Payments not configured</p>
          : <div className="space-y-2">{packs.map(pack => (
            <div key={pack.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${pack.id === 'standard' ? 'border-brand-500/20 bg-brand-500/5' : 'hover:bg-white/[0.02]'}`} style={{ borderColor: pack.id === 'standard' ? undefined : 'rgba(255,255,255,0.06)' }}>
              <div>
                <span className="text-[13px] font-medium text-ink-primary">{pack.label}</span>
                <p className="text-[11px] text-ink-tertiary">${((pack.price_cents / 100) / pack.credits).toFixed(2)}/credit</p>
              </div>
              <button onClick={() => handleBuy(pack.id)} disabled={!!buying} className="btn-primary text-[12px] py-1.5 px-3">
                {buying === pack.id ? <Loader2 className="w-3 h-3 animate-spin" /> : `$${(pack.price_cents / 100).toFixed(0)}`}
              </button>
            </div>
          ))}</div>}
        </div>
      </div>
    </div>
  )
}
