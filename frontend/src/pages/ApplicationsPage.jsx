import React, { useState, useEffect } from 'react'
import {
  Bot, FileText, ChevronDown, ChevronUp, Loader2,
  CheckCircle, AlertCircle, Clock, ExternalLink,
  Monitor, Zap, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { listApplications, runAgent, updateApplication, getUser, updateUser } from '../api/client'
import BrowserView from '../components/BrowserView'
import api from '../api/client'

const STATUS_CONFIG = {
  pending:          { color: 'bg-gray-100 text-gray-700',    label: 'Pending',          icon: Clock },
  in_progress:      { color: 'bg-blue-100 text-blue-700',    label: 'In Progress',      icon: Loader2 },
  ready_to_submit:  { color: 'bg-purple-100 text-purple-700',label: 'Ready to Submit',  icon: CheckCircle },
  submitted:        { color: 'bg-green-100 text-green-700',  label: 'Submitted',        icon: CheckCircle },
  applied:          { color: 'bg-green-100 text-green-700',  label: 'Applied',          icon: CheckCircle },
  interviewing:     { color: 'bg-indigo-100 text-indigo-700',label: 'Interviewing',     icon: CheckCircle },
  rejected:         { color: 'bg-red-100 text-red-700',      label: 'Rejected',         icon: AlertCircle },
  offer:            { color: 'bg-emerald-100 text-emerald-700', label: 'Offer!',         icon: CheckCircle },
  not_recommended:  { color: 'bg-orange-100 text-orange-700',label: 'Low Match',        icon: AlertCircle },
}

function AgentLog({ log }) {
  if (!log?.length) return null
  return (
    <div className="mt-3 space-y-1.5">
      {log.map((entry, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
          <span className={`badge flex-shrink-0 ${entry.type === 'tool_call' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
            {entry.type === 'tool_call' ? 'tool' : 'log'}
          </span>
          <span className="line-clamp-2">{entry.summary || entry.content}</span>
        </div>
      ))}
    </div>
  )
}

function ApplicationCard({ app, autoApply, onRunAgent, onRunBrowser, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const [runningAI, setRunningAI] = useState(false)

  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon
  const hasUrl = !!app.job?.url
  const hasCoverLetter = !!app.cover_letter

  const handleAI = async () => {
    setRunningAI(true)
    try { await onRunAgent(app.id) }
    finally { setRunningAI(false) }
  }

  return (
    <div className="card border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-semibold text-gray-900">{app.job?.title || 'Unknown Job'}</h3>
            <span className={`badge ${statusCfg.color} flex items-center gap-1`}>
              <StatusIcon className={`w-3 h-3 ${runningAI ? 'animate-spin' : ''}`} />
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-gray-600">{app.job?.company} · {app.job?.location || 'Location N/A'}</p>
          {app.job?.url && (
            <a href={app.job.url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-0.5">
              View posting <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
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

          {/* AI cover letter button */}
          <button
            onClick={handleAI}
            disabled={runningAI}
            title="Generate cover letter with AI"
            className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {runningAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            {hasCoverLetter ? 'Re-write' : 'Write Cover Letter'}
          </button>

          {/* Browser apply button */}
          <button
            onClick={() => onRunBrowser(app.id)}
            disabled={!hasUrl}
            title={hasUrl ? (autoApply ? 'Auto-apply (no confirmation)' : 'Apply — you\'ll confirm before submit') : 'No URL for this job'}
            className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-colors ${
              !hasUrl
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : autoApply
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'btn-primary'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            {autoApply ? 'Auto-Apply' : 'Apply Now'}
          </button>

          <button onClick={() => setExpanded(v => !v)} className="p-1 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {app.cover_letter && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Cover Letter
                </h4>
                <button
                  onClick={() => navigator.clipboard.writeText(app.cover_letter)}
                  className="text-xs text-primary-600 hover:underline"
                >Copy</button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {app.cover_letter}
              </div>
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
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h4>
            <textarea
              className="input text-sm min-h-[60px] resize-y"
              placeholder="Add notes..."
              defaultValue={app.notes || ''}
              onBlur={e => onStatusChange(app.id, app.status, e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApplicationsPage() {
  const { appUser } = useAppUser()
  const userId = appUser?.id
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [agentMessage, setAgentMessage] = useState(null)
  const [autoApply, setAutoApply] = useState(false)
  const [activeBrowserAppId, setActiveBrowserAppId] = useState(null) // which app has live browser

  useEffect(() => {
    load()
    loadUserSettings()
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

  const loadUserSettings = async () => {
    try {
      const user = await import('../api/client').then(m => m.getUser(userId))
      setAutoApply(!!user.auto_apply)
    } catch {}
  }

  const toggleAutoApply = async () => {
    const newVal = !autoApply
    setAutoApply(newVal)
    try {
      await updateUser(userId, { auto_apply: newVal })
    } catch {}
  }

  const handleRunAgent = async (appId) => {
    setAgentMessage({ id: appId, text: 'Claude is analyzing and writing your cover letter...' })
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
      setAgentMessage({ id: appId, text: 'AI failed. Check your ANTHROPIC_API_KEY.', error: true })
      setTimeout(() => setAgentMessage(null), 5000)
    }
  }

  const handleRunBrowser = async (appId) => {
    try {
      await api.post(`/browser/start/${appId}`)
      setActiveBrowserAppId(appId)
    } catch (e) {
      const msg = e.response?.data?.detail || 'Could not start browser session.'
      setAgentMessage({ id: appId, text: msg, error: true })
      setTimeout(() => setAgentMessage(null), 5000)
    }
  }

  const handleBrowserClose = () => {
    setActiveBrowserAppId(null)
    load() // refresh to pick up any status changes
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
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 mt-1">{applications.length} total · {pendingCount} pending</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Auto-apply toggle */}
          <button
            onClick={toggleAutoApply}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
              autoApply
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            title={autoApply
              ? 'Auto-apply ON: agent submits without asking'
              : 'Auto-apply OFF: agent asks before every submit'}
          >
            {autoApply
              ? <ToggleRight className="w-5 h-5 text-amber-600" />
              : <ToggleLeft className="w-5 h-5 text-gray-400" />
            }
            <span>Auto-Apply</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
              autoApply ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-500'
            }`}>{autoApply ? 'ON' : 'OFF'}</span>
          </button>

          {pendingCount > 0 && (
            <button onClick={handleRunAllPending} className="btn-primary flex items-center gap-2">
              <Bot className="w-4 h-4" /> Write All Cover Letters ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Auto-apply explanation */}
      {autoApply && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-sm text-amber-800">
          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <p><strong>Auto-Apply is ON.</strong> When you click "Auto-Apply" on a job, the AI will fill out and submit the form without stopping to ask you. Turn this off to review before each submission.</p>
        </div>
      )}

      {/* Agent message banner */}
      {agentMessage && (
        <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 border ${
          agentMessage.error ? 'bg-red-50 text-red-700 border-red-200' :
          agentMessage.success ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {!agentMessage.success && !agentMessage.error && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
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
              filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
            }`}
          >
            {s === 'all' ? `All (${applications.length})` : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* List */}
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
            <p className="text-sm mt-1">Go to <span className="text-primary-600">Find Jobs</span> and click "Apply" on jobs you want.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <ApplicationCard
              key={app.id}
              app={app}
              autoApply={autoApply}
              onRunAgent={handleRunAgent}
              onRunBrowser={handleRunBrowser}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Live browser overlay */}
      {activeBrowserAppId && (
        <BrowserView
          applicationId={activeBrowserAppId}
          onClose={handleBrowserClose}
        />
      )}
    </div>
  )
}
