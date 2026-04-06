import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Square, CheckCircle, XCircle, Loader2, Crosshair, Brain, ListChecks, Pause, Play, Send, MousePointer, MessageSquare } from 'lucide-react'
import HuntConfirmModal from './HuntConfirmModal'
import api, { SSE_BASE, interactWithHunt } from '../api/client'

// ── Coordinate helpers ──────────────────────────────────────────────────────
// The <img> uses object-contain inside its flex container.
// We need to find the actual rendered image rect within the element.
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
  // paused interaction state
  const [interactMode, setInteractMode] = useState('click') // 'click' | 'prompt'
  const [isInteracting, setIsInteracting] = useState(false) // visual feedback on click

  const logRef              = useRef(null)
  const imgRef              = useRef(null)
  const latestScreenshot    = useRef(null)
  const hiddenKeyInputRef   = useRef(null)  // captures keyboard when in click mode
  const instructionRef      = useRef(null)

  // ── SSE connection ──────────────────────────────────────────────────────────
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

  // When entering paused state, default to click mode and focus the hidden input
  useEffect(() => {
    if (status === 'paused') {
      setInteractMode('click')
      setTimeout(() => hiddenKeyInputRef.current?.focus(), 50)
    }
  }, [status])

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'connected':
        setStatus('running'); addLog(event); break
      case 'screenshot':
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

  // ── Hunt controls ──────────────────────────────────────────────────────────
  const handleConfirm = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/confirm/${huntId}`) }
  const handleSkip    = async () => { setStatus('running'); setConfirmData(null); await api.post(`/hunt/skip/${huntId}`) }
  const handleStop    = async () => { setStatus('stopping'); setConfirmData(null); await api.post(`/hunt/stop/${huntId}`); onClose?.() }
  const handlePause   = async () => { setStatus('paused'); await api.post(`/hunt/pause/${huntId}`) }
  const handleResume  = async () => {
    const inst = instruction.trim()
    setInstruction('')
    setStatus('running')
    await api.post(`/hunt/resume/${huntId}`, { instruction: inst || null })
  }
  const handleAnswerQuestion = async (answer) => {
    const ans = answer || questionAnswer
    setQuestionData(null); setQuestionAnswer('')
    await api.post(`/hunt/answer/${huntId}`, { answer: ans })
  }

  // ── Interactive browser control (paused only) ──────────────────────────────
  const handleScreenClick = useCallback(async (e) => {
    if (status !== 'paused' || interactMode !== 'click') return
    const coords = clientToViewport(e.clientX, e.clientY, imgRef.current)
    if (!coords) return
    e.preventDefault()
    setIsInteracting(true)
    setTimeout(() => setIsInteracting(false), 120)
    // Re-focus hidden input for keyboard capture
    hiddenKeyInputRef.current?.focus()
    try {
      await interactWithHunt(huntId, { type: 'click', x: coords.x, y: coords.y })
    } catch {}
  }, [status, interactMode, huntId])

  const handleScreenScroll = useCallback(async (e) => {
    if (status !== 'paused' || interactMode !== 'click') return
    const coords = clientToViewport(e.clientX, e.clientY, imgRef.current)
    if (!coords) return
    e.preventDefault()
    try {
      await interactWithHunt(huntId, { type: 'scroll', x: coords.x, y: coords.y, delta_y: e.deltaY })
    } catch {}
  }, [status, interactMode, huntId])

  // Hidden input captures keyboard when clicking on the browser screen
  const handleKeyInput = useCallback(async (e) => {
    if (status !== 'paused' || interactMode !== 'click') return
    // Special keys
    const specialKeys = ['Enter', 'Backspace', 'Delete', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']
    if (specialKeys.includes(e.key)) {
      e.preventDefault()
      try { await interactWithHunt(huntId, { type: 'key', key: e.key }) } catch {}
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Regular character — let hidden input accumulate, then type on change
    }
  }, [status, interactMode, huntId])

  const handleHiddenInputChange = useCallback(async (e) => {
    const text = e.target.value
    if (!text) return
    e.target.value = ''
    try { await interactWithHunt(huntId, { type: 'type', text }) } catch {}
  }, [huntId])

  const statusCfg = {
    connecting: { label: 'Connecting...', color: 'text-yellow-300', spin: true },
    running:    { label: 'Hunting...',    color: 'text-blue-300',    spin: true },
    paused:     { label: 'Paused',        color: 'text-amber-400',   spin: false },
    confirm:    { label: 'Your Input',    color: 'text-amber-400',   spin: false },
    done:       { label: 'Complete',      color: 'text-emerald-400', spin: false },
    error:      { label: 'Error',         color: 'text-red-400',     spin: false },
    stopping:   { label: 'Stopping...',   color: 'text-red-300',     spin: true },
  }[status] || { label: status, color: 'text-white', spin: false }

  const isActive = !['done', 'error', 'stopping'].includes(status)
  const isPaused = status === 'paused'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0618' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0"
           style={{ background: 'linear-gradient(90deg, #120630, #1e0a4a)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-white">Autonomous Hunt</span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${statusCfg.color}`}>
            {statusCfg.spin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {statusCfg.label}
          </div>
          {isPaused && (
            <div className="flex items-center gap-1 text-xs bg-white/10 rounded-lg overflow-hidden border border-white/15">
              <button
                onClick={() => { setInteractMode('click'); setTimeout(() => hiddenKeyInputRef.current?.focus(), 50) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold transition-colors ${interactMode === 'click' ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'}`}
              >
                <MousePointer className="w-3 h-3" /> Click
              </button>
              <button
                onClick={() => { setInteractMode('prompt'); setTimeout(() => instructionRef.current?.focus(), 50) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold transition-colors ${interactMode === 'prompt' ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'}`}
              >
                <MessageSquare className="w-3 h-3" /> Prompt
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-blue-300">{stats.found} found</span>
            <span className="text-emerald-400 font-semibold">{stats.applied} applied</span>
          </div>

          {status === 'running' && (
            <button onClick={handlePause}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-amber-300 px-3 py-1.5 rounded-xl font-semibold text-sm border border-white/15 transition-colors">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}

          {isActive && (
            <button onClick={handleStop}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-semibold text-sm transition-colors">
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          {!isActive && (
            <button onClick={onClose}
              className="text-blue-300 hover:text-white text-sm px-4 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Screenshot panel */}
        <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
          {/* Browser image — interactive when paused */}
          <div className="flex-1 flex items-center justify-center relative">
            <img
              ref={imgRef}
              alt="Browser"
              className="max-w-full max-h-full object-contain select-none"
              style={{
                display: 'block',
                cursor: isPaused && interactMode === 'click' ? 'crosshair' : 'default',
                outline: isPaused ? `2px solid ${isInteracting ? '#f59e0b' : 'rgba(245,158,11,0.4)'}` : 'none',
                outlineOffset: '-2px',
                transition: 'outline-color 0.1s',
              }}
              onClick={handleScreenClick}
              onWheel={handleScreenScroll}
            />

            {/* Hidden keyboard input — focused when clicking in click mode */}
            <input
              ref={hiddenKeyInputRef}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1, top: 0, left: 0 }}
              onKeyDown={handleKeyInput}
              onChange={handleHiddenInputChange}
              tabIndex={-1}
              aria-hidden="true"
            />

            {/* AI cursor overlay */}
            {cursor && (
              <div className="absolute pointer-events-none"
                style={{
                  left: `calc(50% + ${(cursor.cx - 640) / 1280 * 100}%)`,
                  top:  `calc(50% + ${(cursor.cy - 450) / 900  * 100}%)`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4l7 18 3-7 7-3z" fill="rgba(245,158,11,0.9)" stroke="#f59e0b" strokeWidth="1.5"/>
                </svg>
              </div>
            )}

            {/* Click mode hint overlay (first few seconds of pause) */}
            {isPaused && interactMode === 'click' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-semibold"
                     style={{ background: 'rgba(0,0,0,0.7)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <MousePointer className="w-3 h-3" />
                  Click anywhere · Scroll to scroll · Switch to Prompt for AI instructions
                </div>
              </div>
            )}

            {/* No screenshot placeholder */}
            {!imgRef.current?.src && (
              <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                <div>
                  <Crosshair className="w-20 h-20 text-blue-800 mx-auto mb-4" />
                  <p className="text-blue-400 text-sm">Starting hunt...</p>
                  <p className="text-blue-700 text-xs mt-1">Opening browser</p>
                </div>
              </div>
            )}

            {/* Final message overlay */}
            {finalMessage && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
                <div className="rounded-2xl px-12 py-10 text-center border border-white/10 max-w-sm" style={{ background: '#1a1230' }}>
                  {status === 'done'
                    ? <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                    : <XCircle    className="w-14 h-14 text-red-400     mx-auto mb-4" />}
                  <p className="font-bold text-white text-xl mb-2">{status === 'done' ? 'Hunt Complete!' : 'Hunt Stopped'}</p>
                  <p className="text-blue-300 text-sm mb-4">{finalMessage}</p>
                  <p className="text-emerald-400 font-semibold">{stats.applied} applications submitted</p>
                  <button onClick={onClose} className="mt-6 btn-primary text-sm px-6">Done</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Paused control bar (floats at bottom of screen) ──────────── */}
          {isPaused && (
            <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3 border-t border-white/10"
                 style={{ background: 'rgba(10,6,24,0.95)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wide">Paused</span>
              </div>

              {/* Mode label */}
              <span className="text-white/30 text-xs">|</span>
              {interactMode === 'click'
                ? <span className="text-white/50 text-xs">Clicking on screen · Switch to Prompt mode to give AI instructions</span>
                : <span className="text-white/50 text-xs">Type a prompt for the AI, or switch to Click mode to interact directly</span>
              }

              <div className="flex-1" />

              {/* Prompt input — always visible, send resumes with instruction */}
              <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 340 }}>
                <textarea
                  ref={instructionRef}
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (instruction.trim()) handleResume() }
                  }}
                  onFocus={() => setInteractMode('prompt')}
                  placeholder="Give the AI a new instruction (Enter to send)..."
                  rows={1}
                  className="flex-1 rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', caretColor: '#fff', minHeight: 36, maxHeight: 80 }}
                />
                <button
                  onClick={handleResume}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex-shrink-0"
                  style={{
                    background: instruction.trim() ? '#1877F2' : 'rgba(255,255,255,0.1)',
                    color: instruction.trim() ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {instruction.trim() ? <><Send className="w-3.5 h-3.5" /> Send</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-white/10 flex flex-col" style={{ background: '#0f0a1e' }}>
          <div className="flex border-b border-white/10">
            {[
              { id: 'decisions', label: 'Decisions', icon: ListChecks },
              { id: 'log',       label: 'Log',       icon: Brain },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                  tab === id ? 'text-amber-400 border-b-2 border-amber-400' : 'text-blue-400 hover:text-blue-200'
                }`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {tab === 'decisions' ? (
              decisions.length === 0
                ? <p className="text-blue-600 italic text-center mt-4">No decisions yet...</p>
                : [...decisions].reverse().map(d => (
                  <div key={d.id} className={`p-2.5 rounded-xl border ${
                    d.decision === 'apply' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/3'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${d.decision === 'apply' ? 'text-emerald-400' : 'text-blue-600'}`}>
                        {d.decision === 'apply' ? '✓ Applying' : '✗ Skipping'}
                      </span>
                      {d.match_score > 0 && (
                        <span className={`font-bold ${d.match_score >= 70 ? 'text-emerald-400' : 'text-blue-500'}`}>
                          {d.match_score}%
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium truncate">{d.title}</p>
                    <p className="text-blue-400 truncate">{d.company}</p>
                    {d.reason && <p className="text-blue-600 mt-1 leading-relaxed line-clamp-2">{d.reason}</p>}
                  </div>
                ))
            ) : (
              log.length === 0
                ? <p className="text-blue-600 italic text-center mt-4">Waiting for agent...</p>
                : [...log].reverse().map(entry => (
                  <div key={entry.id} className={`flex gap-2 items-start ${
                    entry.type === 'thinking'         ? 'text-blue-500 italic' :
                    entry.type === 'error'            ? 'text-red-400' :
                    entry.type === 'submitted'        ? 'text-emerald-400 font-semibold' :
                    entry.type === 'confirm_required' ? 'text-amber-400 font-semibold' :
                    'text-blue-300'
                  }`}>
                    <span className="flex-shrink-0 mt-0.5">
                      {entry.type === 'thinking' ? '💭' :
                       entry.type === 'error' ? '✗' :
                       entry.type === 'submitted' ? '✓' :
                       entry.type === 'confirm_required' ? '⏸' : '›'}
                    </span>
                    <span className="leading-relaxed">{entry.text}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmData && (
        <HuntConfirmModal data={confirmData} huntId={huntId}
          onConfirm={handleConfirm} onSkip={handleSkip} onStop={handleStop} />
      )}

      {/* Agent question modal */}
      {questionData && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 pb-8"
             style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/10"
               style={{ background: '#1a2744' }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <span className="text-lg">❓</span>
              <p className="font-semibold text-white text-sm">Agent needs your input</p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-blue-100 text-sm leading-relaxed">{questionData.message}</p>
              {questionData.options?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {questionData.options.map((opt, i) => (
                    <button key={i} onClick={() => handleAnswerQuestion(opt)}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 text-blue-200 rounded-xl text-sm font-medium transition-colors">
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
                <button onClick={() => handleAnswerQuestion('Use your best judgment')}
                  className="text-xs text-blue-400 hover:text-blue-200 px-3 transition-colors">
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
