import React, { useEffect, useRef, useState } from 'react'
import { Monitor, Loader2, CheckCircle, XCircle } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import api from '../api/client'

export default function BrowserView({ applicationId, onClose }) {
  const [screenshot, setScreenshot] = useState(null)
  const [actions, setActions] = useState([])
  const [status, setStatus] = useState('connecting')
  const [confirmData, setConfirmData] = useState(null)
  const [finalMessage, setFinalMessage] = useState(null)
  const logRef = useRef(null)

  useEffect(() => {
    const es = new EventSource(`/api/browser/stream/${applicationId}`)
    es.onmessage = (e) => {
      if (e.data === '[DONE]') { es.close(); return }
      try { handleEvent(JSON.parse(e.data)) } catch {}
    }
    es.onerror = () => { setStatus('error'); addAction({ type: 'error', message: 'Connection lost.' }); es.close() }
    return () => es.close()
  }, [applicationId])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [actions])

  const handleEvent = (event) => {
    switch (event.type) {
      case 'connected':   setStatus('running'); addAction(event); break
      case 'screenshot':  setScreenshot(event.data); break
      case 'action': case 'status': addAction(event); break
      case 'confirm_required':
        setStatus('confirm'); setConfirmData(event)
        addAction({ type: 'confirm_required', message: '⏸ Waiting for your confirmation...' }); break
      case 'submitted':
        setStatus('done'); setFinalMessage({ success: true, text: event.message }); addAction(event); break
      case 'cancelled':
        setStatus('done'); setFinalMessage({ success: false, text: 'Not submitted.' }); addAction(event); break
      case 'complete':
        if (status !== 'done') setStatus('done'); addAction(event); setTimeout(() => onClose?.(), 3000); break
      case 'error':
        setStatus('error'); setFinalMessage({ success: false, text: event.message }); addAction(event); break
    }
  }

  const addAction = (event) => {
    const msg = event.message || event.summary || ''
    if (!msg) return
    setActions(prev => [...prev, { id: Date.now() + Math.random(), type: event.type, text: msg }])
  }

  const handleConfirm = async () => { setStatus('running'); setConfirmData(null); await api.post(`/browser/confirm/${applicationId}`) }
  const handleCancel  = async () => { setStatus('running'); setConfirmData(null); await api.post(`/browser/cancel/${applicationId}`) }

  const statusCfg = {
    connecting: { color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30', label: 'Connecting...', spin: true },
    running:    { color: 'bg-primary-500/20 text-primary-300 border border-primary-500/30', label: 'Applying...', spin: true },
    confirm:    { color: 'bg-gold-500/20 text-gold-300 border border-gold-500/30', label: 'Needs Review', spin: false },
    done:       { color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', label: 'Done', spin: false },
    error:      { color: 'bg-red-500/20 text-red-300 border border-red-500/30', label: 'Error', spin: false },
  }[status] || { color: 'bg-white/10 text-white', label: status, spin: false }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(18,6,48,0.88)', backdropFilter: 'blur(12px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-primary-700/40" style={{ background: '#0f0a1e' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 rounded-t-2xl" style={{ background: 'rgba(30,10,74,0.8)' }}>
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-primary-300" />
            <span className="font-semibold text-white text-sm">Live Browser — AI Applying</span>
            <span className={`badge ${statusCfg.color} flex items-center gap-1`}>
              {statusCfg.spin && <Loader2 className="w-3 h-3 animate-spin" />}
              {statusCfg.label}
            </span>
          </div>
          <button onClick={onClose} className="text-primary-300 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors">Close</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
            {screenshot
              ? <img src={`data:image/png;base64,${screenshot}`} alt="Browser" className="max-w-full max-h-full object-contain" />
              : <div className="text-center text-primary-400"><Monitor className="w-16 h-16 mx-auto mb-3 opacity-30" /><p className="text-sm">Waiting for browser...</p></div>
            }
            {finalMessage && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <div className="rounded-2xl px-10 py-8 text-center border border-white/10" style={{ background: '#1a1230' }}>
                  {finalMessage.success
                    ? <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    : <XCircle className="w-12 h-12 text-primary-400 mx-auto mb-3" />
                  }
                  <p className="font-bold text-white text-lg">{finalMessage.text}</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-72 border-l border-white/10 flex flex-col" style={{ background: '#0a0618' }}>
            <div className="px-4 py-2.5 border-b border-white/10">
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide">Agent Log</p>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
              {actions.length === 0
                ? <p className="text-primary-500 italic">Connecting...</p>
                : actions.map(a => (
                  <div key={a.id} className={`flex gap-2 items-start ${
                    a.type === 'error' ? 'text-red-400' : a.type === 'submitted' ? 'text-emerald-400 font-semibold' : a.type === 'confirm_required' ? 'text-gold-400 font-semibold' : 'text-primary-300'
                  }`}>
                    <span className="flex-shrink-0 mt-0.5">{a.type === 'error' ? '✗' : a.type === 'submitted' ? '✓' : a.type === 'confirm_required' ? '⏸' : '›'}</span>
                    <span>{a.text}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
      {confirmData && <ConfirmModal data={confirmData} screenshot={screenshot} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </div>
  )
}
