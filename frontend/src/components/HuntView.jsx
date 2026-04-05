import React, { useEffect, useRef, useState } from 'react'
import { Monitor, Square, CheckCircle, XCircle, Loader2, Crosshair, Brain, ListChecks } from 'lucide-react'
import HuntConfirmModal from './HuntConfirmModal'
import api from '../api/client'

export default function HuntView({ huntId, onClose }) {
  const [screenshot, setScreenshot] = useState(null)
  const [log, setLog] = useState([])               // all action/status/thinking messages
  const [decisions, setDecisions] = useState([])   // job decisions
  const [status, setStatus] = useState('connecting')
  const [confirmData, setConfirmData] = useState(null)
  const [stats, setStats] = useState({ found: 0, applied: 0 })
  const [finalMessage, setFinalMessage] = useState(null)
  const [tab, setTab] = useState('decisions')
  const logRef = useRef(null)

  useEffect(() => {
    const es = new EventSource(`/api/hunt/stream/${huntId}`)
    es.onmessage = (e) => {
      if (e.data === '[DONE]') { es.close(); return }
      try { handleEvent(JSON.parse(e.data)) } catch {}
    }
    es.onerror = () => {
      setStatus('error')
      addLog({ type: 'error', message: 'Connection to hunt session lost.' })
      es.close()
    }
    return () => es.close()
  }, [huntId])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log, decisions, tab])

  const handleEvent = (event) => {
    switch (event.type) {
      case 'connected':
        setStatus('running'); addLog(event); break
      case 'screenshot':
        setScreenshot(event.data); break
      case 'action':
      case 'status':
        addLog(event); break
      case 'thinking':
        addLog({ ...event, type: 'thinking' }); break
      case 'job_decision':
        setDecisions(prev => [...prev, { ...event, id: Date.now() + Math.random() }])
        if (event.decision === 'apply') setStats(s => ({ ...s, found: s.found + 1 }))
        break
      case 'confirm_required':
        setStatus('confirm')
        setConfirmData(event)
        addLog({ type: 'confirm_required', message: `⏸ Review: ${event.job_title} at ${event.company}` })
        break
      case 'submitted':
        setStatus('running')
        setConfirmData(null)
        setStats(s => ({ ...s, applied: event.jobs_applied ?? s.applied + 1 }))
        addLog({ type: 'submitted', message: event.message })
        break
      case 'complete':
        setStatus('done')
        setFinalMessage(event.message || 'Hunt complete!')
        if (event.jobs_found !== undefined) setStats({ found: event.jobs_found, applied: event.jobs_applied })
        addLog(event)
        break
      case 'error':
        setStatus('error')
        setFinalMessage(event.message)
        addLog(event)
        break
    }
  }

  const addLog = (event) => {
    const msg = event.message || ''
    if (!msg) return
    setLog(prev => [...prev, { id: Date.now() + Math.random(), type: event.type, text: msg }])
  }

  const handleConfirm = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/confirm/${huntId}`) }
  const handleSkip    = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/skip/${huntId}`) }
  const handleStop    = async () => {
    setStatus('stopping')
    setConfirmData(null)
    await api.post(`/hunt/stop/${huntId}`)
    onClose?.()
  }

  const statusCfg = {
    connecting: { label: 'Connecting...', color: 'text-yellow-300', spin: true },
    running:    { label: 'Hunting...', color: 'text-primary-300', spin: true },
    confirm:    { label: 'Needs Your Input', color: 'text-gold-400', spin: false },
    done:       { label: 'Complete', color: 'text-emerald-400', spin: false },
    error:      { label: 'Error', color: 'text-red-400', spin: false },
    stopping:   { label: 'Stopping...', color: 'text-red-300', spin: true },
  }[status] || { label: status, color: 'text-white', spin: false }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0618' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #120630, #1e0a4a)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-gold-400" />
            <span className="font-bold text-white">Autonomous Hunt</span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${statusCfg.color}`}>
            {statusCfg.spin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {statusCfg.label}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-primary-300">{stats.found} jobs found</span>
            <span className="text-emerald-400 font-semibold">{stats.applied} applied</span>
          </div>
          {/* Stop button — always visible */}
          {status !== 'done' && status !== 'stopping' && (
            <button onClick={handleStop} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-semibold text-sm transition-colors">
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          {(status === 'done' || status === 'stopping') && (
            <button onClick={onClose} className="text-primary-300 hover:text-white text-sm px-4 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Screenshot panel */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          {screenshot
            ? <img src={`data:image/png;base64,${screenshot}`} alt="Browser" className="max-w-full max-h-full object-contain" />
            : (
              <div className="text-center">
                <Crosshair className="w-20 h-20 text-primary-700 mx-auto mb-4" />
                <p className="text-primary-400 text-sm">Starting hunt...</p>
                <p className="text-primary-600 text-xs mt-1">Claude is opening the browser</p>
              </div>
            )
          }
          {finalMessage && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
              <div className="rounded-2xl px-12 py-10 text-center border border-white/10 max-w-sm" style={{ background: '#1a1230' }}>
                {status === 'done'
                  ? <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                  : <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
                }
                <p className="font-bold text-white text-xl mb-2">{status === 'done' ? 'Hunt Complete!' : 'Hunt Stopped'}</p>
                <p className="text-primary-300 text-sm mb-4">{finalMessage}</p>
                <p className="text-emerald-400 font-semibold">{stats.applied} applications submitted</p>
                <button onClick={onClose} className="mt-6 btn-primary text-sm px-6">Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 border-l border-white/10 flex flex-col" style={{ background: '#0f0a1e' }}>
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {[
              { id: 'decisions', label: 'Decisions', icon: ListChecks },
              { id: 'log',       label: 'Log',       icon: Brain },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                  tab === id ? 'text-gold-400 border-b-2 border-gold-400' : 'text-primary-400 hover:text-primary-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {tab === 'decisions' ? (
              decisions.length === 0 ? (
                <p className="text-primary-500 italic text-center mt-4">No job decisions yet...</p>
              ) : (
                [...decisions].reverse().map(d => (
                  <div key={d.id} className={`p-2.5 rounded-xl border ${
                    d.decision === 'apply'
                      ? 'border-emerald-500/30 bg-emerald-500/8'
                      : 'border-white/8 bg-white/4'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold text-xs ${d.decision === 'apply' ? 'text-emerald-400' : 'text-primary-500'}`}>
                        {d.decision === 'apply' ? '✓ Applying' : '✗ Skipping'}
                      </span>
                      {d.match_score > 0 && (
                        <span className={`text-xs font-bold ${d.match_score >= 70 ? 'text-emerald-400' : 'text-primary-400'}`}>
                          {d.match_score}%
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium truncate">{d.title}</p>
                    <p className="text-primary-400 truncate">{d.company}</p>
                    {d.reason && <p className="text-primary-500 mt-1 leading-relaxed">{d.reason}</p>}
                  </div>
                ))
              )
            ) : (
              log.length === 0 ? (
                <p className="text-primary-500 italic text-center mt-4">Waiting for agent...</p>
              ) : (
                [...log].reverse().map(entry => (
                  <div key={entry.id} className={`flex gap-2 items-start ${
                    entry.type === 'thinking'        ? 'text-primary-400 italic' :
                    entry.type === 'error'           ? 'text-red-400' :
                    entry.type === 'submitted'       ? 'text-emerald-400 font-semibold' :
                    entry.type === 'confirm_required'? 'text-gold-400 font-semibold' :
                    'text-primary-300'
                  }`}>
                    <span className="flex-shrink-0 mt-0.5">
                      {entry.type === 'thinking' ? '💭' :
                       entry.type === 'error' ? '✗' :
                       entry.type === 'submitted' ? '✓' :
                       entry.type === 'confirm_required' ? '⏸' : '›'}
                    </span>
                    <span>{entry.text}</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {confirmData && (
        <HuntConfirmModal
          data={confirmData}
          screenshot={screenshot}
          huntId={huntId}
          onConfirm={handleConfirm}
          onSkip={handleSkip}
          onStop={handleStop}
        />
      )}
    </div>
  )
}
