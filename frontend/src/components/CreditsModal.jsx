import React, { useState, useEffect } from 'react'
import { Zap, X, Loader2, CheckCircle } from 'lucide-react'
import { listPacks, createCheckout } from '../api/client'

export default function CreditsModal({ onClose }) {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    listPacks().then(setPacks).catch(() => setPacks([])).finally(() => setLoading(false))
  }, [])

  const handleBuy = async (packId) => {
    setBuying(packId)
    try {
      const { checkout_url } = await createCheckout(packId)
      window.location.href = checkout_url
    } catch (e) {
      const msg = e.response?.data?.detail || 'Payments not set up yet.'
      alert(msg)
    } finally {
      setBuying(null)
    }
  }

  const PACK_COLORS = {
    starter:  'border-gray-200 hover:border-primary-300',
    standard: 'border-primary-300 bg-primary-50 ring-2 ring-primary-500',
    power:    'border-purple-200 hover:border-purple-400',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-gray-900">Get More Credits</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-5">
            Each credit powers one AI cover letter. Browser auto-apply costs 3 credits.
          </p>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
          ) : packs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Payments aren't set up yet. Add your Stripe key to enable purchases.
            </div>
          ) : (
            <div className="space-y-3">
              {packs.map(pack => (
                <div key={pack.id} className={`rounded-xl border p-4 transition-all cursor-pointer ${PACK_COLORS[pack.id] || 'border-gray-200 hover:border-primary-300'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{pack.label}</span>
                        {pack.id === 'standard' && (
                          <span className="badge bg-primary-100 text-primary-700 text-xs">Most Popular</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ${(pack.price_cents / 100).toFixed(0)} · ${((pack.price_cents / 100) / pack.credits).toFixed(2)} per credit
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuy(pack.id)}
                      disabled={!!buying}
                      className="btn-primary text-sm py-1.5 flex items-center gap-1.5"
                    >
                      {buying === pack.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      ${(pack.price_cents / 100).toFixed(0)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
