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
  const [tab, setTab] = useState('discover') // 'discover' | 'saved'
  const [error, setError] = useState(null)

  // Manual add
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ title: '', company: '', location: '', url: '', description: '' })

  // Manual search override
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoc, setSearchLoc] = useState('')
  const [searching, setSearching] = useState(false)

  const roles = appUser?.target_roles || []
  const locations = appUser?.target_locations || []

  // Auto-discover on first load
  useEffect(() => { discover() }, [userId])

  const discover = async () => {
    setLoading(true)
    setError(null)
    try {
      const discovered = await discoverJobs()
      setJobs(discovered)
    } catch (e) {
      // Fallback to listing existing jobs
      try { setJobs(await listJobs({ limit: 50 })) } catch {}
      if (e?.response?.status !== 401) setError('Could not fetch jobs. Showing cached results.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const discovered = await discoverJobs()
      setJobs(prev => {
        const ids = new Set(prev.map(j => j.id))
        const newOnes = discovered.filter(j => !ids.has(j.id))
        return [...newOnes, ...prev]
      })
    } catch {
      setError('Refresh failed.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery) return
    setSearching(true)
    setError(null)
    try {
      const results = await searchJobs({ query: searchQuery, location: searchLoc }, userId)
      setJobs(prev => {
        const ids = new Set(prev.map(j => j.id))
        return [...results.filter(j => !ids.has(j.id)), ...prev]
      })
      setSearchQuery('')
      setSearchLoc('')
    } catch { setError('Search failed.') }
    finally { setSearching(false) }
  }

  const handleSave = async (jobId) => {
    if (savedIds.has(jobId)) return
    try {
      await createApplication({ user_id: userId, job_id: jobId })
      setSavedIds(prev => new Set([...prev, jobId]))
    } catch (e) {
      if (e.response?.status === 400) setSavedIds(prev => new Set([...prev, jobId]))
    }
  }

  const handleManualAdd = async () => {
    try {
      const job = await createJob({ ...manual, source: 'manual' })
      setJobs(prev => [job, ...prev])
      setManual({ title: '', company: '', location: '', url: '', description: '' })
      setShowManual(false)
    } catch {}
  }

  const handleRemove = async (jobId) => {
    await deleteJob(jobId)
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }

  const displayJobs = tab === 'saved' ? jobs.filter(j => savedIds.has(j.id)) : jobs

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Find Jobs</h1>
          <p className="text-ink-tertiary text-sm mt-1">
            {roles.length > 0
              ? <>Showing results for <span className="text-ink-secondary font-medium">{roles.join(', ')}</span> in <span className="text-ink-secondary font-medium">{locations.join(', ') || 'your area'}</span></>
              : 'Set target roles in your profile to auto-discover jobs'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowManual(v => !v)} className="btn-secondary text-xs">
            {showManual ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="btn-primary text-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-5 mt-4 border-b border-surface-border">
        {[
          { id: 'discover', label: `All Jobs (${jobs.length})` },
          { id: 'saved', label: `Saved (${savedIds.size})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px ${tab === t.id ? 'text-brand-400 border-brand-400' : 'text-ink-tertiary border-transparent hover:text-ink-secondary'}`}>
            {t.label}
          </button>
        ))}
        {/* Inline search */}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
            <input className="input py-1.5 pl-8 pr-3 text-xs w-40" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          {searchQuery && (
            <button onClick={handleSearch} disabled={searching} className="btn-primary py-1.5 text-xs">
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-amber-400 text-sm mb-4 bg-amber-500/10 rounded-xl px-3 py-2 border border-amber-500/20">{error}</p>}

      {/* Manual add */}
      {showManual && (
        <div className="card p-5 mb-5">
          <h3 className="font-semibold text-ink-primary mb-3 text-sm">Add Job Manually</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="input" placeholder="Job Title *" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
            <input className="input" placeholder="Company *" value={manual.company} onChange={e => setManual(m => ({ ...m, company: e.target.value }))} />
            <input className="input" placeholder="Location" value={manual.location} onChange={e => setManual(m => ({ ...m, location: e.target.value }))} />
            <input className="input" placeholder="Job URL" value={manual.url} onChange={e => setManual(m => ({ ...m, url: e.target.value }))} />
          </div>
          <textarea className="input min-h-[60px] resize-y mb-3" placeholder="Description..." value={manual.description} onChange={e => setManual(m => ({ ...m, description: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={handleManualAdd} disabled={!manual.title || !manual.company} className="btn-primary text-sm">Add Job</button>
            <button onClick={() => setShowManual(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <p className="text-sm text-ink-tertiary">Discovering jobs based on your profile...</p>
        </div>
      ) : displayJobs.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-ink-tertiary opacity-20" />
          <p className="font-semibold text-ink-primary">{tab === 'saved' ? 'No saved jobs' : 'No jobs found'}</p>
          <p className="text-sm text-ink-secondary mt-1">{tab === 'saved' ? 'Save jobs by clicking the bookmark icon.' : 'Try refreshing or updating your target roles.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayJobs.map(job => (
            <div key={job.id} className="card p-5 hover:border-brand-500/20 transition-all duration-200 group">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-ink-primary text-sm">{job.title}</h3>
                    {job.remote_type && (
                      <span className={`badge text-xs ${job.remote_type === 'remote' ? 'bg-emerald-900/30 text-emerald-400' : job.remote_type === 'hybrid' ? 'bg-blue-900/30 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {job.remote_type}
                      </span>
                    )}
                    {job.source && job.source !== 'manual' && (
                      <span className="text-xs text-ink-tertiary">{job.source}</span>
                    )}
                  </div>
                  <p className="text-sm text-ink-secondary font-medium">{job.company}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-ink-tertiary">
                    {job.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {job.salary_min ? `$${(job.salary_min/1000).toFixed(0)}k` : ''}
                        {job.salary_min && job.salary_max ? ' – ' : ''}
                        {job.salary_max ? `$${(job.salary_max/1000).toFixed(0)}k` : ''}
                      </span>
                    )}
                    {job.job_type && <span>{job.job_type}</span>}
                  </div>
                  {job.description && (
                    <p className="text-ink-tertiary text-xs mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                      className="p-2 text-ink-tertiary hover:text-brand-400 rounded-lg hover:bg-brand-500/10 transition-all" title="Open listing">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => handleSave(job.id)} disabled={savedIds.has(job.id)}
                    className={`p-2 rounded-lg transition-all ${savedIds.has(job.id) ? 'text-brand-400 bg-brand-500/10' : 'text-ink-tertiary hover:text-brand-400 hover:bg-brand-500/10'}`}
                    title={savedIds.has(job.id) ? 'Saved' : 'Save job'}>
                    {savedIds.has(job.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
