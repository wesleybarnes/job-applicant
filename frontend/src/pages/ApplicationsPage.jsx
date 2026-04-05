import React, { useState, useEffect, useRef } from 'react'
import { Bot, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { listApplications, runAgent, updateApplication } from '../api/client'

const STATUS_CONFIG = {
  pending: { color: 'bg-gray-100 text-gray-700', label: 'Pending', icon: Clock },
  in_progress: { color: 'bg-blue-100 text-blue-700', label: 'In Progress', icon: Loader2 },
  ready_to_submit: { color: 'bg-purple-100 text-purple-700', label: 'Ready to Submit', icon: CheckCircle },
  submitted: { color: 'bg-green-100 text-green-700', label: 'Submitted', icon: CheckCircle },
  applied: { color: 'bg-green-100 text-green-700', label: 'Applied', icon: CheckCircle },
  interviewing: { color: 'bg-indigo-100 text-indigo-700', label: 'Interviewing', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected', icon: AlertCircle },
  offer: { color: 'bg-emerald-100 text-emerald-700', label: 'Offer!', icon: CheckCircle },
  not_recommended: { color: 'bg-orange-100 text-orange-700', label: 'Low Match', icon: AlertCircle },
}

function AgentLog({ log }) {
  if (!log?.length) return null
  return (
    <div className="mt-3 space-y-1.5">
      {log.map((entry, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
          {entry.type === 'tool_call' ? (
            <>
              <span className="badge bg-indigo-100 text-indigo-600 flex-shrink-0">tool</span>
              <span>{entry.summary}</span>
            </>
          ) : (
            <>
              <span className="badge bg-gray-100 text-gray-500 flex-shrink-0">log</span>
              <span className="line-clamp-1">{entry.content}</span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function ApplicationCard({ app, onRunAgent, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const [running, setRunning] = useState(false)

  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  const handleRun = async () => {
    setRunning(true)
    try {
      await onRunAgent(app.id)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="card border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-semibold text-gray-900">{app.job?.title || 'Unknown Job'}</h3>
            <span className={`badge ${statusCfg.color} flex items-center gap-1`}>
              <StatusIcon className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-gray-600">{app.job?.company} · {app.job?.location || 'Location N/A'}</p>
          {app.job?.url && (
            <a href={app.job.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-0.5">
              View posting <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status selector */}
          <select
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
            value={app.status}
            onChange={e => onStatusChange(app.id, e.target.value)}
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Run agent button */}
          <button
            onClick={handleRun}
            disabled={running || app.status === 'in_progress'}
            className="flex items-center gap-1.5 btn-primary text-xs py-1.5"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            {app.cover_letter ? 'Re-run' : 'Run AI'}
          </button>

          <button onClick={() => setExpanded(v => !v)} className="p-1 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {app.cover_letter && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Cover Letter
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {app.cover_letter}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(app.cover_letter)}
                className="text-xs text-primary-600 hover:underline mt-2"
              >
                Copy to clipboard
              </button>
            </div>
          )}

          {app.agent_log?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> Agent Log
              </h4>
              <AgentLog log={app.agent_log} />
            </div>
          )}

          {app.notes !== undefined && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h4>
              <textarea
                className="input text-sm min-h-[60px] resize-y"
                placeholder="Add notes about this application..."
                defaultValue={app.notes || ''}
                onBlur={e => onStatusChange(app.id, app.status, e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ApplicationsPage({ userId }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [agentMessage, setAgentMessage] = useState(null)

  useEffect(() => {
    load()
  }, [userId])

  const load = async () => {
    setLoading(true)
    try {
      const data = await listApplications(userId)
      setApplications(data)
    } finally {
      setLoading(false)
    }
  }

  const handleRunAgent = async (appId) => {
    setAgentMessage({ id: appId, text: 'Agent is analyzing your application...' })
    try {
      const result = await runAgent({ application_id: appId, mode: 'full' })
      setApplications(prev => prev.map(a =>
        a.id === appId
          ? { ...a, status: result.status, cover_letter: result.cover_letter, agent_log: result.agent_log }
          : a
      ))
      setAgentMessage({ id: appId, text: result.message, success: true })
      setTimeout(() => setAgentMessage(null), 4000)
    } catch (e) {
      setAgentMessage({ id: appId, text: 'Agent failed. Check your ANTHROPIC_API_KEY.', error: true })
      setTimeout(() => setAgentMessage(null), 5000)
    }
  }

  const handleRunAllPending = async () => {
    const pending = applications.filter(a => a.status === 'pending')
    for (const app of pending) {
      await handleRunAgent(app.id)
    }
  }

  const handleStatusChange = async (appId, status, notes) => {
    const update = {}
    if (status !== undefined) update.status = status
    if (notes !== undefined) update.notes = notes
    await updateApplication(appId, update)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, ...update } : a))
  }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 mt-1">{applications.length} total · {pendingCount} pending AI processing</p>
        </div>
        {pendingCount > 0 && (
          <button onClick={handleRunAllPending} className="btn-primary flex items-center gap-2">
            <Bot className="w-4 h-4" /> Run AI on All Pending ({pendingCount})
          </button>
        )}
      </div>

      {/* Agent message banner */}
      {agentMessage && (
        <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 border ${
          agentMessage.error ? 'bg-red-50 text-red-700 border-red-200' :
          agentMessage.success ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {!agentMessage.success && !agentMessage.error && <Loader2 className="w-4 h-4 animate-spin" />}
          {agentMessage.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', 'pending', 'ready_to_submit', 'submitted', 'interviewing', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
            }`}
          >
            {s === 'all' ? `All (${applications.length})` : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600">
            {applications.length === 0 ? 'No applications yet' : 'No applications match this filter'}
          </p>
          {applications.length === 0 && (
            <p className="text-sm mt-1">Go to <span className="text-primary-600">Find Jobs</span> and click "Apply" on jobs you're interested in.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <ApplicationCard
              key={app.id}
              app={app}
              onRunAgent={handleRunAgent}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
