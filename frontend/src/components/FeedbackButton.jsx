import React, { useState } from 'react'
import { MessageSquarePlus, X, Loader2, Check } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { submitFeedback } from '../api/client'

const CATEGORIES = [
  { id: 'general',  label: 'General' },
  { id: 'bug',      label: 'Bug' },
  { id: 'feature',  label: 'Feature idea' },
  { id: 'other',    label: 'Other' },
]

/**
 * Floating Feedback button — bottom-right of every page.
 * Click → small modal with category + message. Submit posts to /feedback.
 */
export default function FeedbackButton() {
  const [open, setOpen]     = useState(false)
  const [category, setCat]  = useState('general')
  const [message, setMsg]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState(null)
  const { pathname }        = useLocation()

  const close = () => { setOpen(false); setSent(false); setError(null); setMsg(''); setCat('general') }

  const submit = async () => {
    const text = message.trim()
    if (!text || busy) return
    setBusy(true); setError(null)
    try {
      await submitFeedback({ message: text, category, page: pathname })
      setSent(true)
      setTimeout(close, 1400)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not send feedback. Try again?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium shadow-lg transition-transform hover:scale-105"
        style={{ background: '#5E6AD2', color: '#fff', boxShadow: '0 6px 20px rgba(94,106,210,0.35)' }}
      >
        <MessageSquarePlus className="w-3.5 h-3.5" /> Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl border overflow-hidden" style={{ background: '#0C1220', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-[13px] font-medium text-white">Send feedback</p>
              <button onClick={close} className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-white/[0.05]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-[13px] text-ink-primary">Thanks — we read every one.</p>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setCat(c.id)}
                      className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors ${
                        category === c.id
                          ? 'text-brand-200 bg-brand-500/15 border-brand-500/30'
                          : 'text-ink-tertiary border-white/[0.08] hover:bg-white/[0.04]'
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={e => setMsg(e.target.value)}
                  rows={5}
                  autoFocus
                  placeholder={category === 'bug'
                    ? "What broke? What were you trying to do?"
                    : category === 'feature'
                      ? "What's the idea? Why does it matter to you?"
                      : "What's on your mind? The more specific the better."}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', caretColor: '#fff' }}
                />
                {error && <p className="text-[11.5px] text-red-400">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={close} className="text-[12px] px-3 py-1.5 text-ink-tertiary hover:text-ink-secondary">Cancel</button>
                  <button onClick={submit} disabled={!message.trim() || busy}
                    className="btn-primary text-[12px] py-1.5 px-3 disabled:opacity-40 flex items-center gap-1.5">
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {busy ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
