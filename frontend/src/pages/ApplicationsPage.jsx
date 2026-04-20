import React, { useState, useEffect } from 'react'
import { Bot, FileText, Loader2, CheckCircle, AlertCircle, Clock, ExternalLink, Monitor, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { listApplications, runAgent, updateApplication, updateUser } from '../api/client'
import { useAppUser } from '../App'
import BrowserView from '../components/BrowserView'
import api from '../api/client'

const COLUMNS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'in_progress', label: 'In Progress', icon: Loader2 },
  { key: 'applied', label: 'Applied', icon: CheckCircle, also: ['submitted'] },
  { key: 'interviewing', label: 'Interview', icon: CheckCircle },
]

function AppCard({ app, onRunAgent, onRunBrowser }) {
  const [running, setRunning] = useState(false)
  return (
    <div className="rounded-lg border p-3 hover:border-white/[0.12] transition-colors group" style={{ background: '#1A1A1A', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-ink-primary truncate">{app.job?.title || 'Unknown'}</p>
          <p className="text-[11px] text-ink-tertiary truncate">{app.job?.company}</p>
        </div>
        {app.job?.url && (
          <a href={app.job.url} target="_blank" rel="noopener noreferrer" className="text-ink-tertiary hover:text-ink-secondary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={async () => { setRunning(true); try { await onRunAgent(app.id) } finally { setRunning(false) } }}
          disabled={running}
          className="text-[10px] font-medium text-ink-tertiary hover:text-brand-400 transition-colors flex items-center gap-1">
          {running ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Bot className="w-2.5 h-2.5" />}
          {app.cover_letter ? 'Redo' : 'Letter'}
        </button>
        {app.job?.url && (
          <button onClick={() => onRunBrowser(app.id)}
            className="text-[10px] font-medium text-ink-tertiary hover:text-brand-400 transition-colors flex items-center gap-1">
            <Monitor className="w-2.5 h-2.5" /> Apply
          </button>
        )}
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  const { appUser } = useAppUser()
  const userId = appUser?.id
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoApply, setAutoApply] = useState(false)
  const [activeBrowserAppId, setActiveBrowserAppId] = useState(null)
  const [banner, setBanner] = useState(null)

  useEffect(() => { load(); setAutoApply(!!appUser?.auto_apply) }, [userId])
  const load = async () => { setLoading(true); try { setApplications(await listApplications(userId)) } finally { setLoading(false) } }
  const toggleAutoApply = async () => { const val = !autoApply; setAutoApply(val); try { await updateUser(userId, { auto_apply: val }) } catch {} }

  const handleRunAgent = async (appId) => {
    setBanner({ text: 'Writing cover letter...' })
    try {
      const result = await runAgent({ application_id: appId, mode: 'full' })
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: result.status, cover_letter: result.cover_letter } : a))
      setBanner(null)
    } catch { setBanner({ text: 'Failed', error: true }); setTimeout(() => setBanner(null), 3000) }
  }

  const handleRunBrowser = async (appId) => {
    try { await api.post(`/browser/start/${appId}`); setActiveBrowserAppId(appId) }
    catch (e) { setBanner({ text: e.response?.data?.detail || 'Failed', error: true }); setTimeout(() => setBanner(null), 3000) }
  }

  const getColumnApps = (col) => {
    const statuses = [col.key, ...(col.also || [])]
    return applications.filter(a => statuses.includes(a.status))
  }

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col animate-fade-in">
      {/* Header bar */}
      <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-[17px] font-medium text-ink-primary tracking-tight">Applications</h1>
          <p className="text-[12px] text-ink-tertiary mt-0.5">{applications.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleAutoApply}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${autoApply ? 'text-brand-400 border-brand-500/20 bg-brand-500/5' : 'text-ink-tertiary border-white/[0.08] hover:bg-white/[0.03]'}`}>
            {autoApply ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            Auto-apply {autoApply ? 'on' : 'off'}
          </button>
        </div>
      </div>

      {banner && (
        <div className={`mx-6 mt-3 px-3 py-2 rounded-lg text-[12px] flex items-center gap-2 ${banner.error ? 'text-red-400 bg-red-500/10' : 'text-brand-400 bg-brand-500/10'}`}>
          {!banner.error && <Loader2 className="w-3 h-3 animate-spin" />} {banner.text}
        </div>
      )}

      {/* ── Kanban columns ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-ink-tertiary" /></div>
      ) : applications.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <FileText className="w-8 h-8 mx-auto mb-3 text-ink-tertiary opacity-20" />
            <p className="text-[14px] text-ink-secondary">No applications yet</p>
            <p className="text-[12px] text-ink-tertiary mt-1">Save jobs or start a hunt to begin</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 min-w-max h-full">
            {COLUMNS.map(col => {
              const colApps = getColumnApps(col)
              const Icon = col.icon
              return (
                <div key={col.key} className="w-[260px] flex flex-col">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Icon className="w-3.5 h-3.5 text-ink-tertiary" />
                    <span className="text-[12px] font-medium text-ink-secondary">{col.label}</span>
                    <span className="text-[11px] text-ink-tertiary ml-auto">{colApps.length}</span>
                  </div>
                  {/* Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {colApps.map(app => (
                      <AppCard key={app.id} app={app} onRunAgent={handleRunAgent} onRunBrowser={handleRunBrowser} />
                    ))}
                    {colApps.length === 0 && (
                      <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                        <p className="text-[11px] text-ink-tertiary">No items</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeBrowserAppId && <BrowserView applicationId={activeBrowserAppId} onClose={() => { setActiveBrowserAppId(null); load() }} />}
    </div>
  )
}
