import React, { useState, useEffect } from 'react'
import { Bot, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, Clock, ExternalLink, Monitor, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { listApplications, runAgent, updateApplication, updateUser } from '../api/client'
import { useAppUser } from '../App'
import BrowserView from '../components/BrowserView'
import api from '../api/client'

const STATUS_CONFIG = {
  pending:         { color: 'bg-zinc-800 text-zinc-400', label: 'Pending', icon: Clock },
  in_progress:     { color: 'bg-brand-900/30 text-brand-400', label: 'In Progress', icon: Loader2 },
  ready_to_submit: { color: 'bg-blue-900/30 text-blue-400', label: 'Ready', icon: CheckCircle },
  submitted:       { color: 'bg-emerald-900/30 text-emerald-400', label: 'Submitted', icon: CheckCircle },
  applied:         { color: 'bg-emerald-900/30 text-emerald-400', label: 'Applied', icon: CheckCircle },
  interviewing:    { color: 'bg-blue-900/30 text-blue-400', label: 'Interviewing', icon: CheckCircle },
  rejected:        { color: 'bg-red-900/30 text-red-400', label: 'Rejected', icon: AlertCircle },
  offer:           { color: 'bg-emerald-900/30 text-emerald-400', label: 'Offer!', icon: CheckCircle },
  not_recommended: { color: 'bg-amber-900/30 text-amber-400', label: 'Low Match', icon: AlertCircle },
}

function ApplicationRow({ app, autoApply, onRunAgent, onRunBrowser, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const [runningAI, setRunningAI] = useState(false)
  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  return (
    <div className={`transition-colors ${expanded ? 'bg-surface-hover/30' : 'hover:bg-surface-hover/30'}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-primary text-sm">{app.job?.title || 'Unknown'}</h3>
            <span className={`badge text-xs flex items-center gap-1 ${statusCfg.color}`}><StatusIcon className={`w-3 h-3 ${runningAI ? 'animate-spin' : ''}`} />{statusCfg.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-tertiary">
            <span>{app.job?.company}</span>
            <span>·</span>
            <span>{app.job?.location || 'N/A'}</span>
            {app.job?.url && <a href={app.job.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 flex items-center gap-0.5 ml-1"><ExternalLink className="w-2.5 h-2.5" /></a>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select className="text-xs border border-surface-border rounded-lg px-2 py-1.5 text-ink-secondary bg-surface-card outline-none focus:border-brand-500 transition-colors"
            value={app.status} onChange={e => onStatusChange(app.id, e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={async () => { setRunningAI(true); try { await onRunAgent(app.id) } finally { setRunningAI(false) } }} disabled={runningAI} className="btn-secondary text-xs py-1.5 px-3">
            {runningAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />} {app.cover_letter ? 'Redo' : 'Letter'}
          </button>
          <button onClick={() => onRunBrowser(app.id)} disabled={!app.job?.url}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${!app.job?.url ? 'bg-surface-hover text-ink-tertiary cursor-not-allowed' : 'btn-primary py-1.5'}`}>
            <Monitor className="w-3 h-3" /> Apply
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-1 text-ink-tertiary hover:text-ink-primary transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {app.cover_letter && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Cover Letter</span>
                <button onClick={() => navigator.clipboard.writeText(app.cover_letter)} className="text-xs text-brand-400 hover:text-brand-300 font-medium">Copy</button>
              </div>
              <div className="bg-surface-bg rounded-xl p-4 text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-surface-border">{app.cover_letter}</div>
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider block mb-1.5">Notes</span>
            <textarea className="input text-sm min-h-[50px] resize-y" placeholder="Private notes..." defaultValue={app.notes || ''} onBlur={e => onStatusChange(app.id, app.status, e.target.value)} />
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
  const [banner, setBanner] = useState(null)
  const [autoApply, setAutoApply] = useState(false)
  const [activeBrowserAppId, setActiveBrowserAppId] = useState(null)

  useEffect(() => { load(); setAutoApply(!!appUser?.auto_apply) }, [userId])
  const load = async () => { setLoading(true); try { setApplications(await listApplications(userId)) } finally { setLoading(false) } }
  const toggleAutoApply = async () => { const val = !autoApply; setAutoApply(val); try { await updateUser(userId, { auto_apply: val }) } catch {} }
  const handleRunAgent = async (appId) => { setBanner({ text: 'Writing cover letter...' }); try { const result = await runAgent({ application_id: appId, mode: 'full' }); setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: result.status, cover_letter: result.cover_letter, agent_log: result.agent_log } : a)); setBanner({ text: result.message, success: true }); setTimeout(() => setBanner(null), 4000) } catch { setBanner({ text: 'AI failed.', error: true }); setTimeout(() => setBanner(null), 5000) } }
  const handleRunBrowser = async (appId) => { try { await api.post(`/browser/start/${appId}`); setActiveBrowserAppId(appId) } catch (e) { setBanner({ text: e.response?.data?.detail || 'Failed.', error: true }); setTimeout(() => setBanner(null), 5000) } }
  const handleStatusChange = async (appId, status, notes) => { const u = {}; if (status !== undefined) u.status = status; if (notes !== undefined) u.notes = notes; await updateApplication(appId, u); setApplications(prev => prev.map(a => a.id === appId ? { ...a, ...u } : a)) }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Applications</h1>
          <p className="text-ink-secondary mt-1 text-sm">{applications.length} total · {pendingCount} pending</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleAutoApply}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${autoApply ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' : 'bg-surface-card border-surface-border text-ink-secondary'}`}>
            {autoApply ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />} Auto-Apply
          </button>
          {pendingCount > 0 && <button onClick={() => applications.filter(a => a.status === 'pending').forEach(a => handleRunAgent(a.id))} className="btn-primary text-xs"><Bot className="w-3.5 h-3.5" /> Write All ({pendingCount})</button>}
        </div>
      </div>

      {banner && (
        <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 border ${banner.error ? 'bg-red-500/10 text-red-400 border-red-500/20' : banner.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-brand-500/10 text-brand-400 border-brand-500/20'}`}>
          {!banner.success && !banner.error && <Loader2 className="w-4 h-4 animate-spin" />} {banner.text}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', 'pending', 'in_progress', 'submitted', 'interviewing', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === s ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'bg-surface-card text-ink-secondary border border-surface-border hover:border-brand-500/30'}`}>
            {s === 'all' ? `All (${applications.length})` : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-brand-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-ink-tertiary opacity-20" />
          <p className="font-semibold text-ink-primary">{applications.length === 0 ? 'No applications' : 'No match'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-surface-border">
          {filtered.map(app => <ApplicationRow key={app.id} app={app} autoApply={autoApply} onRunAgent={handleRunAgent} onRunBrowser={handleRunBrowser} onStatusChange={handleStatusChange} />)}
        </div>
      )}
      {activeBrowserAppId && <BrowserView applicationId={activeBrowserAppId} onClose={() => { setActiveBrowserAppId(null); load() }} />}
    </div>
  )
}
