import React, { useState, useEffect } from 'react'
import {
  Bot, FileText, ChevronDown, ChevronUp, Loader2,
  CheckCircle, AlertCircle, Clock, ExternalLink,
  Monitor, Zap, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { listApplications, runAgent, updateApplication, updateUser } from '../api/client'
import { useAppUser } from '../App'
import BrowserView from '../components/BrowserView'
import api from '../api/client'

const STATUS_CONFIG = {
  pending:          { color: 'bg-zinc-100 text-zinc-600',          label: 'Pending',          icon: Clock },
  in_progress:      { color: 'bg-brand-50 text-brand-600',         label: 'In Progress',      icon: Loader2 },
  ready_to_submit:  { color: 'bg-violet-50 text-violet-700',       label: 'Ready',            icon: CheckCircle },
  submitted:        { color: 'bg-emerald-50 text-emerald-700',     label: 'Submitted',        icon: CheckCircle },
  applied:          { color: 'bg-emerald-50 text-emerald-700',     label: 'Applied',          icon: CheckCircle },
  interviewing:     { color: 'bg-violet-50 text-violet-700',       label: 'Interviewing',     icon: CheckCircle },
  rejected:         { color: 'bg-red-50 text-red-600',             label: 'Rejected',         icon: AlertCircle },
  offer:            { color: 'bg-emerald-50 text-emerald-700',     label: 'Offer!',           icon: CheckCircle },
  not_recommended:  { color: 'bg-amber-50 text-amber-700',         label: 'Low Match',        icon: AlertCircle },
}

function ApplicationCard({ app, autoApply, onRunAgent, onRunBrowser, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const [runningAI, setRunningAI] = useState(false)

  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  const handleAI = async () => {
    setRunningAI(true)
    try { await onRunAgent(app.id) }
    finally { setRunningAI(false) }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-ink-primary text-sm">{app.job?.title || 'Unknown Job'}</h3>
            <span className={`badge text-xs flex items-center gap-1 ${statusCfg.color}`}>
              <StatusIcon className={`w-3 h-3 ${runningAI ? 'animate-spin' : ''}`} />
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-ink-secondary">{app.job?.company} · {app.job?.location || 'Location N/A'}</p>
          {app.job?.url && (
            <a href={app.job.url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-0.5">
              View posting <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <select
            className="text-xs border border-surface-border rounded-xl px-2.5 py-2 text-ink-secondary bg-white outline-none focus:border-brand-400 transition-colors"
            value={app.status}
            onChange={e => onStatusChange(app.id, e.target.value)}
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <button
            onClick={handleAI}
            disabled={runningAI}
            className="flex items-center gap-1.5 btn-secondary text-xs py-2"
          >
            {runningAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            {app.cover_letter ? 'Re-write' : 'Cover Letter'}
          </button>

          <button
            onClick={() => onRunBrowser(app.id)}
            disabled={!app.job?.url}
            className={`flex items-center gap-1.5 text-xs py-2 px-4 rounded-xl font-semibold transition-all ${
              !app.job?.url
                ? 'bg-surface-hover text-ink-tertiary cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            {autoApply ? 'Auto-Apply' : 'Apply'}
          </button>

          <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-ink-tertiary hover:text-ink-primary rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 pt-5 border-t border-surface-border space-y-4">
          {app.cover_letter && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Cover Letter
                </h4>
                <button onClick={() => navigator.clipboard.writeText(app.cover_letter)} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                  Copy
                </button>
              </div>
              <div className="bg-surface-hover rounded-2xl p-5 text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {app.cover_letter}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">Notes</h4>
            <textarea
              className="input text-sm min-h-[60px] resize-y"
              placeholder="Add private notes..."
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
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('all')
  const [banner, setBanner]             = useState(null)
  const [autoApply, setAutoApply]       = useState(false)
  const [activeBrowserAppId, setActiveBrowserAppId] = useState(null)

  useEffect(() => {
    load()
    setAutoApply(!!appUser?.auto_apply)
  }, [userId])

  const load = async () => {
    setLoading(true)
    try { setApplications(await listApplications(userId)) }
    finally { setLoading(false) }
  }

  const toggleAutoApply = async () => {
    const val = !autoApply
    setAutoApply(val)
    try { await updateUser(userId, { auto_apply: val }) } catch {}
  }

  const handleRunAgent = async (appId) => {
    setBanner({ text: 'Claude is writing your cover letter...' })
    try {
      const result = await runAgent({ application_id: appId, mode: 'full' })
      setApplications(prev => prev.map(a =>
        a.id === appId ? { ...a, status: result.status, cover_letter: result.cover_letter, agent_log: result.agent_log } : a
      ))
      setBanner({ text: result.message, success: true })
      setTimeout(() => setBanner(null), 4000)
    } catch {
      setBanner({ text: 'AI failed. Check ANTHROPIC_API_KEY.', error: true })
      setTimeout(() => setBanner(null), 5000)
    }
  }

  const handleRunBrowser = async (appId) => {
    try { await api.post(`/browser/start/${appId}`); setActiveBrowserAppId(appId) }
    catch (e) {
      setBanner({ text: e.response?.data?.detail || 'Could not start browser.', error: true })
      setTimeout(() => setBanner(null), 5000)
    }
  }

  const handleStatusChange = async (appId, status, notes) => {
    const update = {}
    if (status !== undefined) update.status = status
    if (notes  !== undefined) update.notes  = notes
    await updateApplication(appId, update)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, ...update } : a))
  }

  const filtered     = filter === 'all' ? applications : applications.filter(a => a.status === filter)
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-title text-ink-primary">Applications</h1>
          <p className="text-ink-secondary mt-1.5 text-sm">{applications.length} total · {pendingCount} pending</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleAutoApply}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              autoApply
                ? 'bg-brand-50 border-brand-200 text-brand-700'
                : 'bg-white border-surface-border text-ink-secondary hover:border-ink-tertiary'
            }`}
          >
            {autoApply ? <ToggleRight className="w-5 h-5 text-brand-500" /> : <ToggleLeft className="w-5 h-5 text-ink-tertiary" />}
            Auto-Apply
            <span className={`text-xs px-1.5 py-0.5 rounded-lg font-bold ${autoApply ? 'bg-brand-500 text-white' : 'bg-surface-hover text-ink-tertiary'}`}>
              {autoApply ? 'ON' : 'OFF'}
            </span>
          </button>

          {pendingCount > 0 && (
            <button onClick={() => applications.filter(a => a.status === 'pending').forEach(a => handleRunAgent(a.id))} className="btn-primary flex items-center gap-2">
              <Bot className="w-4 h-4" /> Write All Cover Letters ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {autoApply && (
        <div className="mb-6 p-4 bg-brand-50 border border-brand-100 rounded-2xl flex items-start gap-2.5 text-sm text-brand-700">
          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-500" />
          <p><strong>Auto-Apply is ON.</strong> The AI will fill and submit applications without asking for confirmation. Turn off to review before each submit.</p>
        </div>
      )}

      {banner && (
        <div className={`mb-5 p-3.5 rounded-2xl text-sm flex items-center gap-2 border ${
          banner.error   ? 'bg-red-50 text-red-700 border-red-100' :
          banner.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
          'bg-brand-50 text-brand-700 border-brand-100'
        }`}>
          {!banner.success && !banner.error && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
          {banner.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'in_progress', 'submitted', 'interviewing', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === s
                ? 'bg-ink-primary text-white'
                : 'bg-white text-ink-secondary border border-surface-border hover:border-ink-tertiary'
            }`}
          >
            {s === 'all' ? `All (${applications.length})` : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-20 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-ink-tertiary opacity-30" />
          <p className="font-semibold text-ink-primary">
            {applications.length === 0 ? 'No applications yet' : 'No applications match this filter'}
          </p>
          {applications.length === 0 && (
            <p className="text-sm text-ink-secondary mt-1">Go to <span className="text-brand-500 font-medium">Find Jobs</span> and add jobs to your queue.</p>
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

      {activeBrowserAppId && (
        <BrowserView applicationId={activeBrowserAppId} onClose={() => { setActiveBrowserAppId(null); load() }} />
      )}
    </div>
  )
}
