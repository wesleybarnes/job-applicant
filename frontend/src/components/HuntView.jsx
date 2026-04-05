import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Square, CheckCircle, XCircle, Loader2, Crosshair, Brain, ListChecks, Pause, Play, Send } from 'lucide-react'
import HuntConfirmModal from './HuntConfirmModal'
import api, { SSE_BASE } from '../api/client'

export default function HuntView({ huntId, onClose }) {
  const [cursor, setCursor]           = useState(null)
  const [log, setLog]                 = useState([])
  const [decisions, setDecisions]     = useState([])
  const [status, setStatus]           = useState('connecting')
  const [confirmData, setConfirmData] = useState(null)
  const [questionData, setQuestionData] = useState(null)  // {message, options}
  const [questionAnswer, setQuestionAnswer] = useState('')
  const [stats, setStats]             = useState({ found: 0, applied: 0 })
  const [finalMessage, setFinalMessage] = useState(null)
  const [tab, setTab]                 = useState('decisions')
  const [instruction, setInstruction] = useState('')
  const logRef              = useRef(null)
  const imgRef              = useRef(null)
  const latestScreenshot    = useRef(null)

  useEffect(() => {
    const es = new EventSource(`${SSE_BASE}/hunt/stream/${huntId}`)
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

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'connected':
        setStatus('running'); addLog(event); break
      case 'screenshot':
        // Direct DOM update for zero-lag rendering — skip React re-render
        if (imgRef.current && event.data) {
          imgRef.current.src = `data:image/png;base64,${event.data}`
          latestScreenshot.current = event.data
        }
        if (event.cx != null) setCursor({ cx: event.cx, cy: event.cy })
        break
      case 'action':
      case 'status':
        addLog(event); break
      case 'thinking':
        addLog({ ...event, type: 'thinking' }); break
      case 'job_decision':
        setDecisions(prev => [...prev, { ...event, id: Date.now() + Math.random() }])
        if (event.decision === 'apply') setStats(s => ({ ...s, found: s.found + 1 }))
        break
      case 'question':
        setQuestionData(event)
        addLog({ type: 'confirm_required', message: `❓ ${event.message}` })
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
  }, [])

  const addLog = (event) => {
    const msg = event.message || ''
    if (!msg) return
    setLog(prev => [...prev, { id: Date.now() + Math.random(), type: event.type, text: msg }])
  }

  const handleConfirm = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/confirm/${huntId}`) }
  const handleSkip    = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/skip/${huntId}`) }
  const handleStop    = async () => {
    setStatus('stopping'); setConfirmData(null)
    await api.post(`/hunt/stop/${huntId}`)
    onClose?.()
  }
  const handlePause   = async () => {
    setStatus('paused')
    await api.post(`/hunt/pause/${huntId}`)
  }
  const handleAnswerQuestion = async (answer) => {
    const ans = answer || questionAnswer
    setQuestionData(null)
    setQuestionAnswer('')
    await api.post(`/hunt/answer/${huntId}`, { answer: ans })
  }

  const handleResume  = async () => {
    const inst = instruction.trim()
    setInstruction('')
    setStatus('running')
    await api.post(`/hunt/resume/${huntId}`, { instruction: inst || null })
  }

  const statusCfg = {
    connecting: { label: 'Connecting...', color: 'text-yellow-300', spin: true },
    running:    { label: 'Hunting...', color: 'text-primary-300', spin: true },
    paused:     { label: 'Paused', color: 'text-gold-400', spin: false },
    confirm:    { label: 'Needs Your Input', color: 'text-gold-400', spin: false },
    done:       { label: 'Complete', color: 'text-emerald-400', spin: false },
    error:      { label: 'Error', color: 'text-red-400', spin: false },
    stopping:   { label: 'Stopping...', color: 'text-red-300', spin: true },
  }[status] || { label: status, color: 'text-white', spin: false }

  const isActive = !['done', 'error', 'stopping'].includes(status)

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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-primary-300">{stats.found} jobs found</span>
            <span className="text-emerald-400 font-semibold">{stats.applied} applied</span>
          </div>

          {/* Pause/Resume */}
          {status === 'running' && (
            <button onClick={handlePause} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-gold-300 px-3 py-1.5 rounded-xl font-semibold text-sm border border-white/15 transition-colors">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}
          {status === 'paused' && (
            <button onClick={handleResume} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-semibold text-sm transition-colors">
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}

          {/* Stop */}
          {isActive && status !== 'paused' && (
            <button onClick={handleStop} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-semibold text-sm transition-colors">
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          {status === 'paused' && (
            <button onClick={handleStop} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-semibold text-sm transition-colors">
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          {['done', 'error', 'stopping'].includes(status) && (
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
          {/* Use img ref for direct DOM updates — bypasses React for zero lag */}
          <img
            ref={imgRef}
            alt="Browser"
            className="max-w-full max-h-full object-contain"
            style={{ display: 'block' }}
          />

          {/* Cursor overlay */}
          {cursor && imgRef.current && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${(cursor.cx / 1280) * 100}%`,
                top: `${(cursor.cy / 900) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 4l7 18 3-7 7-3z" fill="rgba(245,158,11,0.9)" stroke="#f59e0b" strokeWidth="1.5"/>
              </svg>
            </div>
          )}

          {/* Paused overlay */}
          {status === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
              <div className="rounded-2xl px-8 py-6 text-center border border-white/10 max-w-md w-full mx-4" style={{ background: '#1a1230' }}>
                <Pause className="w-10 h-10 text-gold-400 mx-auto mb-3" />
                <p className="font-bold text-white text-lg mb-1">Agent Paused</p>
                <p className="text-primary-400 text-sm mb-4">You have control. Give an instruction or just resume.</p>
                <div className="flex gap-2">
                  <input
                    value={instruction}
                    onChange={e => setInstruction(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleResume()}
                    placeholder="Optional: tell the agent what to do next..."
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', caretColor: '#fff' }}
                    autoFocus
                  />
                  <button onClick={handleResume} className="btn-gold flex items-center gap-1.5 px-4 py-2 text-sm">
                    <Play className="w-3.5 h-3.5" />
                    {instruction ? 'Send' : 'Resume'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No screenshot yet */}
          {!imgRef.current?.src && (
            <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
              <div>
                <Crosshair className="w-20 h-20 text-primary-700 mx-auto mb-4" />
                <p className="text-primary-400 text-sm">Starting hunt...</p>
                <p className="text-primary-600 text-xs mt-1">Claude is opening the browser</p>
              </div>
            </div>
          )}

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
                    entry.type === 'thinking'         ? 'text-primary-400 italic' :
                    entry.type === 'error'            ? 'text-red-400' :
                    entry.type === 'submitted'        ? 'text-emerald-400 font-semibold' :
                    entry.type === 'confirm_required' ? 'text-gold-400 font-semibold' :
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
          huntId={huntId}
          onConfirm={handleConfirm}
          onSkip={handleSkip}
          onStop={handleStop}
        />
      )}

      {/* Agent question modal */}
      {questionData && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 pb-8" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/10" style={{ background: '#1a2744' }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <span className="text-lg">❓</span>
              <p className="font-semibold text-white text-sm">Agent needs your input</p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-primary-100 text-sm leading-relaxed">{questionData.message}</p>
              {questionData.options?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {questionData.options.map((opt, i) => (
                    <button key={i} onClick={() => handleAnswerQuestion(opt)}
                      className="px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/40 border border-primary-500/30 text-primary-200 rounded-xl text-sm font-medium transition-colors">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={questionAnswer}
                  onChange={e => setQuestionAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && questionAnswer && handleAnswerQuestion()}
                  placeholder="Type your answer..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', caretColor: '#fff' }}
                  autoFocus
                />
                <button onClick={() => handleAnswerQuestion()} disabled={!questionAnswer}
                  className="btn-primary px-4 py-2 text-sm rounded-xl disabled:opacity-40">
                  Send
                </button>
                <button onClick={() => handleAnswerQuestion('Skip this, use your best judgment')}
                  className="text-xs text-primary-400 hover:text-primary-200 px-3 transition-colors">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
