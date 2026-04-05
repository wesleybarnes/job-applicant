import React, { useEffect, useRef, useState } from 'react'
import { Monitor, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import api from '../api/client'

/**
 * BrowserView — live feed of the Playwright browser session.
 *
 * Props:
 *   applicationId  — the application being processed
 *   onClose        — called when the session ends
 */
export default function BrowserView({ applicationId, onClose }) {
  const [screenshot, setScreenshot] = useState(null)    // latest base64 PNG
  const [actions, setActions] = useState([])             // action log
  const [status, setStatus] = useState('connecting')     // connecting | running | confirm | done | error
  const [confirmData, setConfirmData] = useState(null)   // pending confirmation payload
  const [finalMessage, setFinalMessage] = useState(null)
  const logRef = useRef(null)
  const esRef = useRef(null)

  useEffect(() => {
    const es = new EventSource(`/api/browser/stream/${applicationId}`)
    esRef.current = es

    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        es.close()
        return
      }
      try {
        const event = JSON.parse(e.data)
        handleEvent(event)
      } catch {}
    }

    es.onerror = () => {
      setStatus('error')
      addAction({ type: 'error', message: 'Connection to browser session lost.' })
      es.close()
    }

    return () => es.close()
  }, [applicationId])

  // Auto-scroll action log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [actions])

  const handleEvent = (event) => {
    switch (event.type) {
      case 'connected':
        setStatus('running')
        addAction(event)
        break
      case 'screenshot':
        setScreenshot(event.data)
        break
      case 'action':
      case 'status':
        addAction(event)
        break
      case 'confirm_required':
        setStatus('confirm')
        setConfirmData(event)
        addAction({ type: 'action', message: 'Waiting for your confirmation...' })
        break
      case 'submitted':
        setStatus('done')
        setFinalMessage({ success: true, text: event.message })
        addAction(event)
        break
      case 'cancelled':
        setStatus('done')
        setFinalMessage({ success: false, text: 'Application not submitted.' })
        addAction(event)
        break
      case 'complete':
        if (status !== 'done') setStatus('done')
        addAction(event)
        setTimeout(() => onClose?.(), 3000)
        break
      case 'error':
        setStatus('error')
        setFinalMessage({ success: false, text: event.message })
        addAction(event)
        break
      default:
        break
    }
  }

  const addAction = (event) => {
    const msg = event.message || event.summary || ''
    if (!msg) return
    setActions(prev => [...prev, { id: Date.now(), type: event.type, text: msg }])
  }

  const handleConfirm = async () => {
    setStatus('running')
    setConfirmData(null)
    await api.post(`/browser/confirm/${applicationId}`)
  }

  const handleCancel = async () => {
    setStatus('running')
    setConfirmData(null)
    await api.post(`/browser/cancel/${applicationId}`)
  }

  const statusBadge = {
    connecting: { color: 'bg-yellow-100 text-yellow-700', label: 'Connecting...', icon: Loader2 },
    running:    { color: 'bg-blue-100 text-blue-700',   label: 'Applying...', icon: Loader2 },
    confirm:    { color: 'bg-purple-100 text-purple-700', label: 'Needs Review', icon: Zap },
    done:       { color: 'bg-green-100 text-green-700',  label: 'Done', icon: CheckCircle },
    error:      { color: 'bg-red-100 text-red-700',      label: 'Error', icon: XCircle },
  }[status] || { color: 'bg-gray-100 text-gray-600', label: status, icon: Monitor }

  const StatusIcon = statusBadge.icon
  const isSpinning = status === 'connecting' || status === 'running'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900 text-sm">Live Browser — AI is applying</span>
            <span className={`badge ${statusBadge.color} flex items-center gap-1`}>
              <StatusIcon className={`w-3 h-3 ${isSpinning ? 'animate-spin' : ''}`} />
              {statusBadge.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Screenshot panel */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-hidden">
            {screenshot ? (
              <img
                src={`data:image/png;base64,${screenshot}`}
                alt="Browser screenshot"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-500">
                <Monitor className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Waiting for browser...</p>
              </div>
            )}

            {/* Final message overlay */}
            {finalMessage && (
              <div className={`absolute inset-0 flex items-center justify-center bg-black/60`}>
                <div className={`rounded-2xl px-10 py-8 text-center shadow-xl ${
                  finalMessage.success ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  {finalMessage.success
                    ? <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    : <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  }
                  <p className="font-semibold text-gray-900 text-lg">{finalMessage.text}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action log panel */}
          <div className="w-72 border-l border-gray-200 flex flex-col">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agent Log</p>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
              {actions.length === 0 ? (
                <p className="text-gray-400 italic">Waiting for agent...</p>
              ) : (
                actions.map(a => (
                  <div key={a.id} className={`flex gap-2 items-start ${
                    a.type === 'error' ? 'text-red-600' :
                    a.type === 'submitted' ? 'text-green-700 font-medium' :
                    a.type === 'confirm_required' ? 'text-purple-700 font-medium' :
                    'text-gray-700'
                  }`}>
                    <span className="flex-shrink-0 mt-0.5">
                      {a.type === 'error' ? '✗' :
                       a.type === 'submitted' ? '✓' :
                       a.type === 'confirm_required' ? '⏸' : '›'}
                    </span>
                    <span>{a.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal — shown on top */}
      {confirmData && (
        <ConfirmModal
          data={confirmData}
          screenshot={screenshot}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
