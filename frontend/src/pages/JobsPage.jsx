import React, { useState, useEffect } from 'react'
import { MapPin, DollarSign, Loader2, Building2, ExternalLink, RefreshCw, Bookmark, BookmarkCheck, Plus, X, Search } from 'lucide-react'
import { discoverJobs, searchJobs, listJobs, createApplication, deleteJob, createJob } from '../api/client'
import { useAppUser } from '../App'

export default function JobsPage() {
  const { appUser } = useAppUser()
  const userId = appUser?.id
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [tab, setTab] = useState('discover')
  const [error, setError] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ title: '', company: '', location: '', url: '', description: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => { discover() }, [userId])

  const discover = async () => { setLoading(true); try { setJobs(await discoverJobs()) } catch { try { setJobs(await listJobs({ limit: 50 })) } catch {} } finally { setLoading(false) } }
  const handleRefresh = async () => { setRefreshing(true); try { const d = await discoverJobs(); setJobs(prev => { const ids = new Set(prev.map(j => j.id)); return [...d.filter(j => !ids.has(j.id)), ...prev] }) } catch {} finally { setRefreshing(false) } }
  const handleSearch = async () => { if (!searchQuery) return; setSearching(true); try { const r = await searchJobs({ query: searchQuery }, userId); setJobs(prev => { const ids = new Set(prev.map(j => j.id)); return [...r.filter(j => !ids.has(j.id)), ...prev] }); setSearchQuery('') } catch {} finally { setSearching(false) } }
  const handleSave = async (jobId) => { if (savedIds.has(jobId)) return; try { await createApplication({ user_id: userId, job_id: jobId }); setSavedIds(prev => new Set([...prev, jobId])) } catch (e) { if (e.response?.status === 400) setSavedIds(prev => new Set([...prev, jobId])) } }
  const handleManualAdd = async () => { try { const job = await createJob({ ...manual, source: 'manual' }); setJobs(prev => [job, ...prev]); setManual({ title: '', company: '', location: '', url: '', description: '' }); setShowManual(false) } catch {} }

  const displayJobs = tab === 'saved' ? jobs.filter(j => savedIds.has(j.id)) : jobs

  return (
    <div className="p-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">Jobs</h1>
          <p className="text-xs text-ink-tertiary mt-0.5">
            {appUser?.target_roles?.length ? `Based on: ${appUser.target_roles.join(', ')}` : 'Set target roles in profile'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowManual(v => !v)} className="btn-secondary text-xs py-1.5">{showManual ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}</button>
          <button onClick={handleRefresh} disabled={refreshing} className="btn-primary text-xs py-1.5"><RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-4 mb-4 border-b border-surface-border">
        {['discover', 'saved'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2.5 text-xs font-medium border-b -mb-px transition-colors ${tab === t ? 'text-ink-primary border-brand-400' : 'text-ink-tertiary border-transparent'}`}>
            {t === 'discover' ? `All (${jobs.length})` : `Saved (${savedIds.size})`}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 pb-1.5">
          <input className="input py-1 px-2.5 text-xs w-36" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          {searchQuery && <button onClick={handleSearch} disabled={searching} className="btn-primary py-1 px-2 text-xs">{searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}</button>}
        </div>
      </div>

      {showManual && (
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="input text-xs" placeholder="Title *" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
            <input className="input text-xs" placeholder="Company *" value={manual.company} onChange={e => setManual(m => ({ ...m, company: e.target.value }))} />
            <input className="input text-xs" placeholder="Location" value={manual.location} onChange={e => setManual(m => ({ ...m, location: e.target.value }))} />
            <input className="input text-xs" placeholder="URL" value={manual.url} onChange={e => setManual(m => ({ ...m, url: e.target.value }))} />
          </div>
          <textarea className="input text-xs min-h-[50px] resize-y mb-2" placeholder="Description..." value={manual.description} onChange={e => setManual(m => ({ ...m, description: e.target.value }))} />
          <button onClick={handleManualAdd} disabled={!manual.title || !manual.company} className="btn-primary text-xs py-1.5">Add</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-4 h-4 animate-spin text-ink-tertiary" /></div>
      ) : displayJobs.length === 0 ? (
        <div className="text-center py-16"><Building2 className="w-8 h-8 mx-auto mb-2 text-ink-tertiary opacity-20" /><p className="text-sm text-ink-tertiary">{tab === 'saved' ? 'No saved jobs' : 'No jobs found'}</p></div>
      ) : (
        <div className="space-y-1">
          {displayJobs.map(job => (
            <div key={job.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-hover/50 transition-colors group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-primary truncate">{job.title}</span>
                  {job.remote_type === 'remote' && <span className="badge bg-brand-500/10 text-brand-400 text-[10px]">remote</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-tertiary mt-0.5">
                  <span>{job.company}</span>
                  {job.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>}
                  {job.salary_min && <span><DollarSign className="w-3 h-3 inline" />{Math.round(job.salary_min/1000)}k</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-ink-tertiary hover:text-ink-primary rounded"><ExternalLink className="w-3.5 h-3.5" /></a>}
                <button onClick={() => handleSave(job.id)} className={`p-1.5 rounded ${savedIds.has(job.id) ? 'text-brand-400' : 'text-ink-tertiary hover:text-brand-400'}`}>
                  {savedIds.has(job.id) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
