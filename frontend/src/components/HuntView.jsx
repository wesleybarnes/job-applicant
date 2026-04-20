import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Square, CheckCircle, XCircle, Loader2, Crosshair, Brain, ListChecks, Pause, Play, Send, MousePointer, MessageSquare } from 'lucide-react'
import HuntConfirmModal from './HuntConfirmModal'
import api, { SSE_BASE, interactWithHunt } from '../api/client'

function getImageRenderRect(img) {
  if (!img) return null
  const el = img.getBoundingClientRect()
  const srcW = 1280, srcH = 900
  const elW = el.width, elH = el.height
  const scale = Math.min(elW / srcW, elH / srcH)
  const rW = srcW * scale, rH = srcH * scale
  const ox = (elW - rW) / 2, oy = (elH - rH) / 2
  return { left: el.left + ox, top: el.top + oy, width: rW, height: rH, scale }
}

function clientToViewport(clientX, clientY, img) {
  const r = getImageRenderRect(img)
  if (!r) return null
  const x = (clientX - r.left) / r.scale
  const y = (clientY - r.top)  / r.scale
  if (x < 0 || y < 0 || x > 1280 || y > 900) return null
  return { x: Math.round(x), y: Math.round(y) }
}

export default function HuntView({ huntId, onClose }) {
  const [cursor, setCursor]         = useState(null)
  const [log, setLog]               = useState([])
  const [decisions, setDecisions]   = useState([])
  const [status, setStatus]         = useState('connecting')
  const [confirmData, setConfirmData] = useState(null)
  const [questionData, setQuestionData] = useState(null)
  const [questionAnswer, setQuestionAnswer] = useState('')
  const [stats, setStats]           = useState({ found: 0, applied: 0 })
  const [finalMessage, setFinalMessage] = useState(null)
  const [tab, setTab]               = useState('decisions')
  const [instruction, setInstruction] = useState('')
  const [interactMode, setInteractMode] = useState('click')
  const [isInteracting, setIsInteracting] = useState(false)

  const logRef              = useRef(null)
  const imgRef              = useRef(null)
  const latestScreenshot    = useRef(null)
  const hiddenKeyInputRef   = useRef(null)
  const instructionRef      = useRef(null)

  useEffect(() => {
    const es = new EventSource(`${SSE_BASE}/hunt/stream/${huntId}`)
    es.onmessage = (e) => {
      if (e.data === '[DONE]') { es.close(); return }
      try { handleEvent(JSON.parse(e.data)) } catch {}
    }
    es.onerror = () => { setStatus('error'); addLog({ type: 'error', message: 'Connection to hunt session lost.' }); es.close() }
    return () => es.close()
  }, [huntId])

  // Only auto-scroll if user is already near the bottom (not reading old entries)
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (isNearBottom) el.scrollTop = el.scrollHeight
  }, [log, decisions, tab])
  useEffect(() => { if (status === 'paused') { setInteractMode('click'); setTimeout(() => hiddenKeyInputRef.current?.focus(), 50) } }, [status])

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'connected': setStatus('running'); addLog(event); break
      case 'screenshot':
        if (imgRef.current && event.data) { imgRef.current.src = `data:image/${event.fmt || 'png'};base64,${event.data}`; latestScreenshot.current = event.data }
        if (event.cx != null) setCursor({ cx: event.cx, cy: event.cy }); break
      case 'action': case 'status': addLog(event); break
      case 'thinking': addLog({ ...event, type: 'thinking' }); break
      case 'job_decision':
        setDecisions(prev => [...prev, { ...event, id: Date.now() + Math.random() }])
        if (event.decision === 'apply') setStats(s => ({ ...s, found: s.found + 1 })); break
      case 'question': setQuestionData(event); addLog({ type: 'confirm_required', message: `❓ ${event.message}` }); break
      case 'confirm_required': setStatus('confirm'); setConfirmData(event); addLog({ type: 'confirm_required', message: `⏸ Review: ${event.job_title} at ${event.company}` }); break
      case 'submitted': setStatus('running'); setConfirmData(null); setStats(s => ({ ...s, applied: event.jobs_applied ?? s.applied + 1 })); addLog({ type: 'submitted', message: event.message }); break
      case 'complete': setStatus('done'); setFinalMessage(event.message || 'Hunt complete!'); if (event.jobs_found !== undefined) setStats({ found: event.jobs_found, applied: event.jobs_applied }); addLog(event); break
      case 'error': setStatus('error'); setFinalMessage(event.message); addLog(event); break
    }
  }, [])

  const addLog = (event) => { const msg = event.message || ''; if (!msg) return; setLog(prev => [...prev, { id: Date.now() + Math.random(), type: event.type, text: msg }]) }

  const handleConfirm = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/confirm/${huntId}`) }
  const handleSkip    = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/skip/${huntId}`) }
  const handleStop    = async () => { setStatus('stopping'); setConfirmData(null); await api.post(`/hunt/stop/${huntId}`); onClose?.() }
  const handlePause   = async () => { setStatus('paused'); await api.post(`/hunt/pause/${huntId}`) }
  const handleResume  = async () => { const inst = instruction.trim(); setInstruction(''); setStatus('running'); await api.post(`/hunt/resume/${huntId}`, { instruction: inst || null }) }
  const handleAnswerQuestion = async (answer) => { const ans = answer || questionAnswer; setQuestionData(null); setQuestionAnswer(''); await api.post(`/hunt/answer/${huntId}`, { answer: ans }) }

  const handleScreenClick = useCallback(async (e) => {
    if (status !== 'paused' || interactMode !== 'click') return
    const coords = clientToViewport(e.clientX, e.clientY, imgRef.current)
    if (!coords) return; e.preventDefault(); setIsInteracting(true); setTimeout(() => setIsInteracting(false), 120)
    hiddenKeyInputRef.current?.focus()
    try { await interactWithHunt(huntId, { type: 'click', x: coords.x, y: coords.y }) } catch {}
  }, [status, interactMode, huntId])

  const handleScreenScroll = useCallback(async (e) => {
    if (status !== 'paused' || interactMode !== 'click') return
    const coords = clientToViewport(e.clientX, e.clientY, imgRef.current)
    if (!coords) return; e.preventDefault()
    try { await interactWithHunt(huntId, { type: 'scroll', x: coords.x, y: coords.y, delta_y: e.deltaY }) } catch {}
  }, [status, interactMode, huntId])

  const handleKeyInput = useCallback(async (e) => {
    if (status !== 'paused' || interactMode !== 'click') return
    const specialKeys = ['Enter', 'Backspace', 'Delete', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']
    if (specialKeys.includes(e.key)) { e.preventDefault(); try { await interactWithHunt(huntId, { type: 'key', key: e.key }) } catch {} }
  }, [status, interactMode, huntId])

  const handleHiddenInputChange = useCallback(async (e) => {
    const text = e.target.value; if (!text) return; e.target.value = ''
    try { await interactWithHunt(huntId, { type: 'type', text }) } catch {}
  }, [huntId])

  const statusCfg = {
    connecting: { label: 'Connecting...', color: 'text-amber-400', spin: true },
    running:    { label: 'Hunting...',    color: 'text-brand-400',  spin: true },
    paused:     { label: 'Paused',        color: 'text-amber-400',  spin: false },
    confirm:    { label: 'Your Input',    color: 'text-amber-400',  spin: false },
    done:       { label: 'Complete',      color: 'text-emerald-400', spin: false },
    error:      { label: 'Error',         color: 'text-red-400',     spin: false },
    stopping:   { label: 'Stopping...',   color: 'text-red-400',     spin: true },
  }[status] || { label: status, color: 'text-white', spin: false }

  const isActive = !['done', 'error', 'stopping'].includes(status)
  const isPaused = status === 'paused'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#060A14' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 flex-shrink-0" style={{ background: 'rgba(6,182,212,0.06)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-brand-400" />
            <span className="font-bold text-white">Autonomous Hunt</span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${statusCfg.color}`}>
            {statusCfg.spin && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {statusCfg.label}
          </div>
          {isPaused && (
            <div className="flex items-center gap-0.5 text-xs bg-white/8 rounded-xl overflow-hidden border border-white/10">
              <button onClick={() => { setInteractMode('click'); setTimeout(() => hiddenKeyInputRef.current?.focus(), 50) }} className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold transition-colors ${interactMode === 'click' ? 'bg-brand-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
                <MousePointer className="w-3 h-3" /> Click
              </button>
              <button onClick={() => { setInteractMode('prompt'); setTimeout(() => instructionRef.current?.focus(), 50) }} className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold transition-colors ${interactMode === 'prompt' ? 'bg-brand-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
                <MessageSquare className="w-3 h-3" /> Prompt
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">{stats.found} found</span>
            <span className="text-emerald-400 font-bold">{stats.applied} applied</span>
          </div>
          {status === 'running' && <button onClick={handlePause} className="flex items-center gap-1.5 bg-white/8 hover:bg-white/12 text-amber-400 px-3 py-1.5 rounded-xl font-semibold text-sm border border-white/10 transition-colors"><Pause className="w-3.5 h-3.5" /> Pause</button>}
          {isActive && <button onClick={handleStop} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-semibold text-sm transition-colors"><Square className="w-3.5 h-3.5" /> Stop</button>}
          {!isActive && <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm px-4 py-1.5 rounded-xl hover:bg-white/10 transition-colors">Close</button>}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Screenshot panel */}
        <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
          <div className="flex-1 flex items-center justify-center relative">
            <img ref={imgRef} alt="Browser" className="max-w-full max-h-full object-contain select-none"
              style={{ display: 'block', cursor: isPaused && interactMode === 'click' ? 'crosshair' : 'default', outline: isPaused ? `2px solid ${isInteracting ? '#06B6D4' : 'rgba(6,182,212,0.3)'}` : 'none', outlineOffset: '-2px', transition: 'outline-color 0.1s' }}
              onClick={handleScreenClick} onWheel={handleScreenScroll} />
            <input ref={hiddenKeyInputRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1, top: 0, left: 0 }} onKeyDown={handleKeyInput} onChange={handleHiddenInputChange} tabIndex={-1} aria-hidden="true" />

            {cursor && (
              <div className="absolute pointer-events-none" style={{ left: `calc(50% + ${(cursor.cx - 640) / 1280 * 100}%)`, top: `calc(50% + ${(cursor.cy - 450) / 900 * 100}%)`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 4l7 18 3-7 7-3z" fill="rgba(6,182,212,0.9)" stroke="#06B6D4" strokeWidth="1.5"/></svg>
              </div>
            )}

            {isPaused && interactMode === 'click' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-semibold glass-dark border border-white/10" style={{ color: '#22D3EE' }}>
                  <MousePointer className="w-3 h-3" /> Click anywhere · Scroll · Type · Switch to Prompt for AI
                </div>
              </div>
            )}

            {!imgRef.current?.src && (
              <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                <div><Crosshair className="w-20 h-20 text-brand-900 mx-auto mb-4" /><p className="text-brand-400 text-sm">Starting hunt...</p><p className="text-brand-800 text-xs mt-1">Opening browser</p></div>
              </div>
            )}

            {finalMessage && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
                <div className="rounded-3xl px-12 py-10 text-center border border-white/10 max-w-sm" style={{ background: '#0C1220' }}>
                  {status === 'done' ? <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" /> : <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />}
                  <p className="font-bold text-white text-xl mb-2">{status === 'done' ? 'Hunt Complete!' : 'Hunt Stopped'}</p>
                  <p className="text-zinc-400 text-sm mb-4">{finalMessage}</p>
                  <p className="text-emerald-400 font-bold">{stats.applied} applications submitted</p>
                  <button onClick={onClose} className="mt-6 btn-primary text-sm px-6">Done</button>
                </div>
              </div>
            )}
          </div>

          {isPaused && (
            <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3 border-t border-white/10 glass-dark">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wide">Paused</span>
              </div>
              <span className="text-white/20 text-xs">|</span>
              {interactMode === 'click'
                ? <span className="text-white/40 text-xs">Click on screen · Type to fill fields · Switch to Prompt for AI</span>
                : <span className="text-white/40 text-xs">Give the AI instructions · Switch to Click for direct control</span>
              }
              <div className="flex-1" />
              <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 340 }}>
                <textarea ref={instructionRef} value={instruction} onChange={e => setInstruction(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (instruction.trim()) handleResume() } }}
                  onFocus={() => setInteractMode('prompt')}
                  placeholder="Give the AI instructions (Enter to send)..."
                  rows={1} className="flex-1 rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', caretColor: '#fff', minHeight: 36, maxHeight: 80 }} />
                <button onClick={handleResume} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all flex-shrink-0"
                  style={{ background: instruction.trim() ? 'linear-gradient(135deg, #06B6D4, #0891B2)' : 'rgba(255,255,255,0.08)', color: instruction.trim() ? '#fff' : 'rgba(255,255,255,0.3)', boxShadow: instruction.trim() ? '0 2px 8px rgba(6,182,212,0.3)' : 'none' }}>
                  {instruction.trim() ? <><Send className="w-3.5 h-3.5" /> Send</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-white/10 flex flex-col" style={{ background: '#060A14' }}>
          <div className="flex border-b border-white/10">
            {[{ id: 'decisions', label: 'Decisions', icon: ListChecks }, { id: 'log', label: 'Log', icon: Brain }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${tab === id ? 'text-brand-400 border-b-2 border-brand-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {tab === 'decisions' ? (
              decisions.length === 0 ? <p className="text-zinc-600 italic text-center mt-4">No decisions yet...</p>
              : [...decisions].reverse().map(d => (
                <div key={d.id} className={`p-2.5 rounded-xl border ${d.decision === 'apply' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold ${d.decision === 'apply' ? 'text-emerald-400' : 'text-zinc-600'}`}>{d.decision === 'apply' ? '✓ Applying' : '✗ Skipping'}</span>
                    {d.match_score > 0 && <span className={`font-bold ${d.match_score >= 70 ? 'text-emerald-400' : 'text-zinc-500'}`}>{d.match_score}%</span>}
                  </div>
                  <p className="text-white font-medium truncate">{d.title}</p>
                  <p className="text-zinc-400 truncate">{d.company}</p>
                  {d.reason && <p className="text-zinc-600 mt-1 leading-relaxed line-clamp-2">{d.reason}</p>}
                </div>
              ))
            ) : (
              log.length === 0 ? <p className="text-zinc-600 italic text-center mt-4">Waiting for agent...</p>
              : [...log].reverse().map(entry => (
                <div key={entry.id} className={`flex gap-2 items-start ${entry.type === 'thinking' ? 'text-brand-500 italic' : entry.type === 'error' ? 'text-red-400' : entry.type === 'submitted' ? 'text-emerald-400 font-semibold' : entry.type === 'confirm_required' ? 'text-amber-400 font-semibold' : 'text-zinc-400'}`}>
                  <span className="flex-shrink-0 mt-0.5">{entry.type === 'thinking' ? '💭' : entry.type === 'error' ? '✗' : entry.type === 'submitted' ? '✓' : entry.type === 'confirm_required' ? '⏸' : '›'}</span>
                  <span className="leading-relaxed">{entry.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {confirmData && <HuntConfirmModal data={confirmData} huntId={huntId} onConfirm={handleConfirm} onSkip={handleSkip} onStop={handleStop} />}

      {questionData && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 pb-8" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/10" style={{ background: '#0C1220' }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2"><span className="text-lg">❓</span><p className="font-bold text-white text-sm">Agent needs your input</p></div>
            <div className="p-5 space-y-4">
              <p className="text-zinc-300 text-sm leading-relaxed">{questionData.message}</p>
              {questionData.options?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {questionData.options.map((opt, i) => <button key={i} onClick={() => handleAnswerQuestion(opt)} className="px-3 py-1.5 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/20 text-brand-300 rounded-xl text-sm font-medium transition-colors">{opt}</button>)}
                </div>
              )}
              <div className="flex gap-2">
                <input value={questionAnswer} onChange={e => setQuestionAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && questionAnswer && handleAnswerQuestion()} placeholder="Type your answer..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', caretColor: '#fff' }} autoFocus />
                <button onClick={() => handleAnswerQuestion()} disabled={!questionAnswer} className="btn-primary px-4 py-2 text-sm rounded-xl disabled:opacity-40">Send</button>
                <button onClick={() => handleAnswerQuestion('Use your best judgment')} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 transition-colors">Skip</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
